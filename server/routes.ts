import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { insertProductSchema, insertCsvUploadSchema, insertSettingsSchema } from "@shared/schema";

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// CSV parsing utility function
interface ParsedRow {
  sku?: string;
  productName?: string;
  quantity?: string;
  [key: string]: any;
}

function detectCSVFormat(headers: string[]): 'amazon' | 'shopify' | 'generic' {
  const headerStr = headers.join(',').toLowerCase();
  console.log('Detecting CSV format from headers:', headers);
  
  // Amazon format detection - check for specific Amazon headers
  if (headerStr.includes('fulfillment channel') || headerStr.includes('open orders') ||
      (headerStr.includes('sku') && headerStr.includes('product name') && !headerStr.includes('variant'))) {
    console.log('Detected Amazon format');
    return 'amazon';
  }
  
  // Shopify format detection - check for specific Shopify headers
  if (headerStr.includes('handle') || headerStr.includes('variant sku') || headerStr.includes('variant inventory qty')) {
    console.log('Detected Shopify format');
    return 'shopify';
  }
  
  console.log('Detected generic format');
  return 'generic';
}

function transformHeadersForFormat(header: string, format: 'amazon' | 'shopify' | 'generic'): string {
  const normalized = header.toLowerCase().trim();
  
  switch (format) {
    case 'amazon':
      if (normalized === 'sku') return 'sku';
      if (normalized === 'product name') return 'productName';
      if (normalized === 'quantity') return 'quantity';
      return header; // Keep original header if no match
      
    case 'shopify':
      if (normalized === 'variant sku') return 'sku';
      if (normalized === 'title') return 'productName';
      if (normalized === 'variant inventory qty') return 'quantity';
      return header; // Keep original header if no match
      
    case 'generic':
      // Generic format with flexible matching
      if (normalized.includes('sku') || normalized === 'id') return 'sku';
      if (normalized.includes('name') || normalized.includes('title')) return 'productName';
      if (normalized.includes('quantity') || normalized.includes('stock') || normalized.includes('inventory')) return 'quantity';
      return header; // Keep original header if no match
  }
  
  return header;
}

function parseCSV(csvContent: string): ParsedRow[] {
  console.log('Starting CSV parsing...');
  
  // First pass to detect format
  const headerResult = Papa.parse(csvContent, {
    header: false,
    skipEmptyLines: true,
    preview: 1,
  });

  if (headerResult.errors.length > 0) {
    console.error('Header parsing error:', headerResult.errors[0]);
    throw new Error(`CSV parsing error: ${headerResult.errors[0].message}`);
  }

  const headers = headerResult.data[0] as string[];
  const format = detectCSVFormat(headers);
  console.log('Original headers:', headers);
  console.log('Detected format:', format);

  // Second pass with format-specific parsing
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => transformHeadersForFormat(header, format),
  });

  if (result.errors.length > 0) {
    console.error('Data parsing error:', result.errors[0]);
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  const parsedData = result.data as ParsedRow[];
  console.log('Raw parsed data (first 2 rows):', parsedData.slice(0, 2));
  
  // Additional validation and cleaning based on format
  const validData = parsedData.filter(row => {
    // Check for empty rows
    if (!row || Object.keys(row).length === 0) {
      return false;
    }
    
    // Ensure we have required fields
    const hasSku = row.sku && String(row.sku).trim() !== '';
    const hasName = row.productName && String(row.productName).trim() !== '';
    const hasQuantity = row.quantity !== undefined && row.quantity !== null && String(row.quantity).trim() !== '';
    
    if (!hasSku || !hasName || !hasQuantity) {
      console.log('Skipping row due to missing data:', {
        sku: row.sku,
        productName: row.productName,
        quantity: row.quantity,
        hasSku,
        hasName,
        hasQuantity
      });
      return false;
    }
    
    return true;
  }).map(row => {
    const quantity = parseInt(String(row.quantity)) || 0;
    console.log('Processing row:', {
      sku: row.sku,
      productName: row.productName,
      originalQuantity: row.quantity,
      parsedQuantity: quantity
    });
    
    return {
      ...row,
      sku: String(row.sku).trim(),
      productName: String(row.productName).trim(),
      quantity: String(quantity),
    };
  });

  console.log(`Parsed ${validData.length} valid rows from ${parsedData.length} total rows`);
  return validData;
}

// Inventory reconciliation logic
async function reconcileInventory(globalThreshold: number) {
  const allProducts = await storage.getAllProducts();
  
  for (const product of allProducts) {
    const totalQuantity = product.channels.reduce((sum, channel) => sum + channel.quantity, 0);
    const isLowStock = totalQuantity < (product.lowStockThreshold || globalThreshold);
    
    await storage.updateProduct(product.id, {
      totalQuantity,
      isLowStock,
      lowStockThreshold: product.lowStockThreshold || globalThreshold,
    });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Upload and process CSV file
  app.post("/api/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!req.body.channel) {
        return res.status(400).json({ error: "Channel is required" });
      }

      const channel = req.body.channel as "Amazon" | "Shopify";
      const csvContent = req.file.buffer.toString('utf-8');
      
      // Create upload record
      const uploadRecord = await storage.createCsvUpload({
        filename: req.file.originalname,
        channel,
        status: "processing",
      });

      try {
        // Parse CSV with enhanced format detection
        const parsedData = parseCSV(csvContent);
        let processedCount = 0;
        let skippedCount = 0;

        console.log(`Processing ${parsedData.length} rows from ${channel} CSV`);

        // Process each row
        for (const row of parsedData) {
          const quantity = parseInt(row.quantity) || 0;
          
          console.log(`Processing: ${row.sku} - ${row.productName} (${quantity} units from ${channel})`);
          
          // Check if product exists
          const existingProduct = await storage.getProductBySku(row.sku);
          
          if (existingProduct) {
            // Update existing product - keep other channels and update/add this channel
            const updatedChannels = existingProduct.channels.filter(c => c.channel !== channel);
            updatedChannels.push({ channel: channel, quantity });
            
            const totalQuantity = updatedChannels.reduce((sum, c) => sum + c.quantity, 0);
            const settings = await storage.getSettings();
            const isLowStock = totalQuantity < (existingProduct.lowStockThreshold || settings.globalLowStockThreshold);
            
            await storage.updateProduct(existingProduct.id, {
              channels: updatedChannels,
              totalQuantity,
              isLowStock,
            });
          } else {
            // Create new product
            const settings = await storage.getSettings();
            const channels = [{ channel: channel, quantity }];
            const isLowStock = quantity < settings.globalLowStockThreshold;
            
            await storage.createProduct({
              sku: row.sku,
              productName: row.productName,
              channels,
              totalQuantity: quantity,
              lowStockThreshold: settings.globalLowStockThreshold,
              isLowStock,
            });
          }
          
          processedCount++;
        }

        // Update upload record as completed
        await storage.updateCsvUpload(uploadRecord.id, {
          status: "completed",
          productsCount: processedCount,
        });

        // Reconcile all inventory
        const settings = await storage.getSettings();
        await reconcileInventory(settings.globalLowStockThreshold);

        res.json({
          success: true,
          uploadId: uploadRecord.id,
          processedCount,
          skippedCount,
          message: `Successfully processed ${processedCount} products from ${channel}${skippedCount > 0 ? ` (${skippedCount} rows skipped)` : ''}`,
        });

      } catch (parseError) {
        // Update upload record as error
        await storage.updateCsvUpload(uploadRecord.id, {
          status: "error",
          errorMessage: parseError instanceof Error ? parseError.message : "Unknown error",
        });

        res.status(400).json({
          error: "CSV processing failed",
          details: parseError instanceof Error ? parseError.message : "Unknown error",
        });
      }

    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Get CSV upload history
  app.get("/api/uploads", async (req, res) => {
    try {
      const uploads = await storage.getAllCsvUploads();
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      const validatedSettings = insertSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(validatedSettings);
      
      // Reconcile inventory with new threshold
      await reconcileInventory(updatedSettings.globalLowStockThreshold);
      
      res.json(updatedSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: "Invalid settings data", details: error.message });
      } else {
        res.status(500).json({ error: "Failed to update settings" });
      }
    }
  });

  // Export inventory as CSV
  app.get("/api/export", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      
      // Generate CSV content matching the inventory overview table format
      const headers = [
        'SKU', 
        'Product Name', 
        'Amazon Quantity', 
        'Shopify Quantity', 
        'Total Quantity', 
        'Low Stock Threshold', 
        'Stock Status (Low Stock/In Stock)'
      ];
      const csvRows = [headers];
      
      products.forEach(product => {
        const amazonQty = product.channels.find(c => c.channel === 'Amazon')?.quantity || 0;
        const shopifyQty = product.channels.find(c => c.channel === 'Shopify')?.quantity || 0;
        
        csvRows.push([
          product.sku,
          product.productName,
          amazonQty.toString(),
          shopifyQty.toString(),
          product.totalQuantity.toString(),
          product.lowStockThreshold.toString(),
          product.isLowStock ? 'Low Stock' : 'In Stock'
        ]);
      });
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory-report.csv');
      res.send(csvContent);
      
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Manual reconciliation endpoint
  app.post("/api/reconcile", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      await reconcileInventory(settings.globalLowStockThreshold);
      
      const products = await storage.getAllProducts();
      res.json({ 
        success: true, 
        message: "Inventory reconciled successfully",
        totalProducts: products.length,
        lowStockCount: products.filter(p => p.isLowStock).length,
      });
    } catch (error) {
      console.error("Reconciliation error:", error);
      res.status(500).json({ error: "Reconciliation failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
