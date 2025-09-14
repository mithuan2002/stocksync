
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

// Enhanced CSV parsing utility functions
interface ParsedRow {
  sku?: string;
  productName?: string;
  quantity?: string;
  [key: string]: any;
}

interface DetectedFormat {
  format: 'amazon' | 'shopify' | 'generic';
  channel: 'Amazon' | 'Shopify';
  confidence: number;
  mappings: {
    sku: string;
    productName: string;
    quantity: string;
  };
}

function intelligentFormatDetection(headers: string[]): DetectedFormat {
  const headerStr = headers.join(',').toLowerCase();
  console.log('Analyzing headers for intelligent detection:', headers);
  
  // Define format signatures with confidence scoring
  const formatSignatures = {
    amazon: {
      required: ['sku', 'product name', 'quantity'],
      optional: ['fulfillment channel', 'open orders', 'asin'],
      indicators: ['fulfillment', 'asin', 'fnsku'],
      baseConfidence: 0.9
    },
    shopify: {
      required: ['variant sku', 'title', 'variant inventory qty'],
      optional: ['handle', 'option1 name', 'variant price'],
      indicators: ['variant', 'handle', 'option'],
      baseConfidence: 0.9
    }
  };

  let bestMatch: DetectedFormat = {
    format: 'generic',
    channel: 'Amazon',
    confidence: 0.3,
    mappings: { sku: '', productName: '', quantity: '' }
  };

  // Check Amazon format
  let amazonScore = 0;
  let amazonMappings = { sku: '', productName: '', quantity: '' };

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    
    // Direct matches
    if (normalized === 'sku') {
      amazonScore += 0.3;
      amazonMappings.sku = header;
    }
    if (normalized === 'product name') {
      amazonScore += 0.3;
      amazonMappings.productName = header;
    }
    if (normalized === 'quantity') {
      amazonScore += 0.3;
      amazonMappings.quantity = header;
    }
    
    // Indicator bonuses
    if (formatSignatures.amazon.indicators.some(ind => normalized.includes(ind))) {
      amazonScore += 0.1;
    }
  }

  if (amazonScore > bestMatch.confidence) {
    bestMatch = {
      format: 'amazon',
      channel: 'Amazon',
      confidence: amazonScore,
      mappings: amazonMappings
    };
  }

  // Check Shopify format
  let shopifyScore = 0;
  let shopifyMappings = { sku: '', productName: '', quantity: '' };

  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    
    // Direct matches
    if (normalized === 'variant sku') {
      shopifyScore += 0.3;
      shopifyMappings.sku = header;
    }
    if (normalized === 'title') {
      shopifyScore += 0.3;
      shopifyMappings.productName = header;
    }
    if (normalized === 'variant inventory qty') {
      shopifyScore += 0.3;
      shopifyMappings.quantity = header;
    }
    
    // Indicator bonuses
    if (formatSignatures.shopify.indicators.some(ind => normalized.includes(ind))) {
      shopifyScore += 0.1;
    }
  }

  if (shopifyScore > bestMatch.confidence) {
    bestMatch = {
      format: 'shopify',
      channel: 'Shopify',
      confidence: shopifyScore,
      mappings: shopifyMappings
    };
  }

  // Fallback to intelligent generic matching if no strong match
  if (bestMatch.confidence < 0.7) {
    console.log('Falling back to intelligent generic matching');
    const genericMappings = smartColumnMapping(headers);
    bestMatch = {
      format: 'generic',
      channel: guessChannelFromFilename('') || 'Amazon',
      confidence: 0.6,
      mappings: genericMappings
    };
  }

  console.log('Detection result:', bestMatch);
  return bestMatch;
}

function smartColumnMapping(headers: string[]): { sku: string; productName: string; quantity: string } {
  const mappings = { sku: '', productName: '', quantity: '' };
  
  for (const header of headers) {
    const normalized = header.toLowerCase().trim();
    
    // SKU matching - flexible patterns
    if (!mappings.sku && (
      normalized.includes('sku') || 
      normalized.includes('id') ||
      normalized.includes('code') ||
      normalized === 'item' ||
      normalized.includes('product id')
    )) {
      mappings.sku = header;
    }
    
    // Product name matching - flexible patterns
    if (!mappings.productName && (
      normalized.includes('name') ||
      normalized.includes('title') ||
      normalized.includes('product') ||
      normalized.includes('item name') ||
      normalized.includes('description')
    )) {
      mappings.productName = header;
    }
    
    // Quantity matching - flexible patterns
    if (!mappings.quantity && (
      normalized.includes('quantity') ||
      normalized.includes('qty') ||
      normalized.includes('stock') ||
      normalized.includes('inventory') ||
      normalized.includes('units') ||
      normalized.includes('count') ||
      normalized.includes('available')
    )) {
      mappings.quantity = header;
    }
  }
  
  console.log('Smart column mappings:', mappings);
  return mappings;
}

function guessChannelFromFilename(filename: string): 'Amazon' | 'Shopify' | null {
  const lower = filename.toLowerCase();
  if (lower.includes('amazon') || lower.includes('amz')) return 'Amazon';
  if (lower.includes('shopify') || lower.includes('shop')) return 'Shopify';
  return null;
}

function parseCSVIntelligently(csvContent: string, filename: string = ''): { data: ParsedRow[]; detectedFormat: DetectedFormat } {
  console.log('Starting intelligent CSV parsing for:', filename);
  
  // First pass to detect headers
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
  
  // Intelligent format detection
  const detectedFormat = intelligentFormatDetection(headers);
  
  // Enhance channel detection with filename
  if (detectedFormat.format === 'generic') {
    const filenameChannel = guessChannelFromFilename(filename);
    if (filenameChannel) {
      detectedFormat.channel = filenameChannel;
      detectedFormat.confidence += 0.2;
    }
  }

  console.log('Final detection:', detectedFormat);

  // Parse with detected mappings
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0) {
    console.error('Data parsing error:', result.errors[0]);
    throw new Error(`CSV parsing error: ${result.errors[0].message}`);
  }

  const parsedData = result.data as any[];
  console.log('Raw parsed data sample:', parsedData.slice(0, 2));
  
  // Transform data using detected mappings
  const transformedData = parsedData.map(row => {
    const transformed: ParsedRow = {};
    
    // Map using detected column mappings
    if (detectedFormat.mappings.sku && row[detectedFormat.mappings.sku]) {
      transformed.sku = String(row[detectedFormat.mappings.sku]).trim();
    }
    
    if (detectedFormat.mappings.productName && row[detectedFormat.mappings.productName]) {
      transformed.productName = String(row[detectedFormat.mappings.productName]).trim();
    }
    
    if (detectedFormat.mappings.quantity && row[detectedFormat.mappings.quantity]) {
      transformed.quantity = String(row[detectedFormat.mappings.quantity]).trim();
    }
    
    return transformed;
  }).filter(row => {
    // Validate required fields
    const hasValidSku = row.sku && row.sku !== '';
    const hasValidName = row.productName && row.productName !== '';
    const hasValidQuantity = row.quantity && row.quantity !== '' && !isNaN(parseInt(row.quantity));
    
    const isValid = hasValidSku && hasValidName && hasValidQuantity;
    
    if (!isValid) {
      console.log('Filtering out invalid row:', row);
    }
    
    return isValid;
  });

  console.log(`Parsed ${transformedData.length} valid rows from ${parsedData.length} total rows`);
  
  return {
    data: transformedData,
    detectedFormat
  };
}

// Inventory reconciliation logic
async function reconcileInventory(sellerId: string, globalThreshold: number) {
  const allProducts = await storage.getProductsBySellerId(sellerId);
  
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

// Simple seller context middleware for testing
async function getOrCreateDefaultSeller() {
  const defaultEmail = 'demo@seller.com';
  let seller = await storage.getSellerByEmail(defaultEmail);
  
  if (!seller) {
    try {
      seller = await storage.createSeller({
        email: defaultEmail,
        name: 'Demo Seller',
        companyName: 'Demo Company'
      });
    } catch (error) {
      // If seller already exists due to race condition, fetch it
      seller = await storage.getSellerByEmail(defaultEmail);
      if (!seller) {
        throw error; // Re-throw if still not found
      }
    }
  }
  
  return seller;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const seller = await getOrCreateDefaultSeller();
      const products = await storage.getProductsBySellerId(seller.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Intelligent CSV upload and processing
  app.post("/api/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname;
      
      console.log(`Auto-parsing and processing file: ${filename}`);

      try {
        // Intelligent parsing
        const { data: parsedData, detectedFormat } = parseCSVIntelligently(csvContent, filename);
        
        // Create upload record with detected info
        const seller = await getOrCreateDefaultSeller();
        const uploadRecord = await storage.createCsvUpload({
          sellerId: seller.id,
          filename: filename,
          channel: detectedFormat.channel,
          status: "processing",
        });

        let processedCount = 0;
        let skippedCount = 0;

        console.log(`Processing ${parsedData.length} rows as ${detectedFormat.channel} (${detectedFormat.format} format, confidence: ${detectedFormat.confidence})`);

        // Process each row
        for (const row of parsedData) {
          const quantity = parseInt(row.quantity!) || 0;
          
          console.log(`Processing: ${row.sku} - ${row.productName} (${quantity} units from ${detectedFormat.channel})`);
          
          // Check if product exists
          const seller = await getOrCreateDefaultSeller();
          const existingProduct = await storage.getProductBySku(seller.id, row.sku!);
          
          if (existingProduct) {
            // Update existing product - keep other channels and update/add this channel
            const updatedChannels = existingProduct.channels.filter(c => c.channel !== detectedFormat.channel);
            updatedChannels.push({ channel: detectedFormat.channel, quantity });
            
            const totalQuantity = updatedChannels.reduce((sum, c) => sum + c.quantity, 0);
            const settings = await storage.getSettingsBySellerId(seller.id);
            const isLowStock = totalQuantity < (existingProduct.lowStockThreshold || settings.globalLowStockThreshold);
            
            await storage.updateProduct(existingProduct.id, {
              channels: updatedChannels,
              totalQuantity,
              isLowStock,
            });
          } else {
            // Create new product
            const settings = await storage.getSettingsBySellerId(seller.id);
            const channels = [{ channel: detectedFormat.channel, quantity }];
            const isLowStock = quantity < settings.globalLowStockThreshold;
            
            await storage.createProduct({
              sellerId: seller.id,
              sku: row.sku!,
              productName: row.productName!,
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
        const settings = await storage.getSettingsBySellerId(seller.id);
        await reconcileInventory(seller.id, settings.globalLowStockThreshold);

        res.json({
          success: true,
          uploadId: uploadRecord.id,
          processedCount,
          skippedCount,
          detectedFormat: {
            format: detectedFormat.format,
            channel: detectedFormat.channel,
            confidence: detectedFormat.confidence
          },
          message: `Successfully auto-parsed and processed ${processedCount} products as ${detectedFormat.channel} inventory (${detectedFormat.format} format detected with ${Math.round(detectedFormat.confidence * 100)}% confidence)`,
        });

      } catch (parseError) {
        console.error('Parsing error:', parseError);
        res.status(400).json({
          error: "CSV auto-parsing failed",
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
      const seller = await getOrCreateDefaultSeller();
      const uploads = await storage.getCsvUploadsBySellerId(seller.id);
      res.json(uploads);
    } catch (error) {
      console.error("Error fetching uploads:", error);
      res.status(500).json({ error: "Failed to fetch upload history" });
    }
  });

  // Get settings
  app.get("/api/settings", async (req, res) => {
    try {
      const seller = await getOrCreateDefaultSeller();
      const settings = await storage.getSettingsBySellerId(seller.id);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Update settings
  app.put("/api/settings", async (req, res) => {
    try {
      const seller = await getOrCreateDefaultSeller();
      const validatedSettings = insertSettingsSchema.parse(req.body);
      const updatedSettings = await storage.updateSettings(seller.id, validatedSettings);
      
      // Reconcile inventory with new threshold
      await reconcileInventory(seller.id, updatedSettings.globalLowStockThreshold);
      
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
      const seller = await getOrCreateDefaultSeller();
      const products = await storage.getProductsBySellerId(seller.id);
      
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
      const seller = await getOrCreateDefaultSeller();
      const settings = await storage.getSettingsBySellerId(seller.id);
      await reconcileInventory(seller.id, settings.globalLowStockThreshold);
      
      const products = await storage.getProductsBySellerId(seller.id);
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
