
import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { emailService } from "./emailService";
import { insertProductSchema, insertCsvUploadSchema, insertSettingsSchema, insertSellerSchema, insertSupplierSchema } from "@shared/schema";

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

// Automatic low stock checking function
async function checkAndNotifyLowStock() {
  try {
    const allSellers = await storage.getAllSellers();
    
    for (const seller of allSellers) {
      const settings = await storage.getSettingsBySellerId(seller.id);
      
      if (!settings.emailNotifications) {
        continue; // Skip if notifications are disabled
      }
      
      const products = await storage.getProductsBySellerId(seller.id);
      
      for (const product of products) {
        const totalQuantity = product.totalQuantity || 0;
        const threshold = product.lowStockThreshold || settings.globalLowStockThreshold;
        const isLowStock = totalQuantity <= threshold;
        
        // Send notification for low stock items with suppliers
        if (isLowStock && product.supplierId) {
          try {
            const supplier = await storage.getSupplierById(product.supplierId);
            if (supplier) {
              console.log(`Auto-sending low stock notification for product ${product.sku} (${totalQuantity} <= ${threshold}) to supplier ${supplier.email}`);
              
              const emailTemplate = emailService.generateLowStockEmailTemplate(
                supplier.name,
                product.productName,
                product.sku,
                totalQuantity,
                threshold,
                seller.companyName || seller.name
              );

              const emailSent = await emailService.sendLowStockAlert({
                to: supplier.email,
                subject: `🚨 URGENT: Low Stock Alert - ${product.productName} (SKU: ${product.sku})`,
                html: emailTemplate,
                productName: product.productName,
                sku: product.sku,
                currentStock: totalQuantity,
                threshold: threshold,
              });

              if (emailSent) {
                // Log the notification
                await storage.createNotification({
                  sellerId: seller.id,
                  productId: product.id,
                  supplierId: product.supplierId,
                  type: "auto_low_stock_alert",
                  status: "sent",
                  subject: `Auto Low Stock Alert - ${product.productName}`,
                  message: `Automatic notification: Stock level: ${totalQuantity} units (at or below threshold of ${threshold} units)`,
                });
                
                console.log(`Auto low stock notification sent for product ${product.sku} to supplier ${supplier.email}`);
              } else {
                console.log(`Auto low stock notification failed for product ${product.sku} to supplier ${supplier.email}`);
              }
            }
          } catch (error) {
            console.error(`Failed to send auto notification for product ${product.sku}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in automatic low stock checking:', error);
  }
}

// Inventory reconciliation logic with email notifications
async function reconcileInventory(sellerId: string, globalThreshold: number) {
  const allProducts = await storage.getProductsBySellerId(sellerId);
  const seller = await storage.getSellerById(sellerId);
  const settings = await storage.getSettingsBySellerId(sellerId);
  
  console.log(`Reconciling inventory for seller ${sellerId}, email notifications: ${settings.emailNotifications}`);
  
  for (const product of allProducts) {
    const totalQuantity = product.channels.reduce((sum, channel) => sum + channel.quantity, 0);
    const wasLowStock = product.isLowStock;
    const threshold = product.lowStockThreshold || globalThreshold;
    const isLowStock = totalQuantity <= threshold; // Changed from < to <= for more accurate detection
    
    await storage.updateProduct(product.id, {
      totalQuantity,
      isLowStock,
      lowStockThreshold: threshold,
    });

    // Send email notification for low stock items (both newly low and already low with supplier assigned)
    if (isLowStock && product.supplierId && settings.emailNotifications) {
      try {
        const supplier = await storage.getSupplierById(product.supplierId);
        if (supplier && seller) {
          console.log(`Sending low stock notification for product ${product.sku} (${totalQuantity} <= ${threshold}) to supplier ${supplier.email}`);
          
          const emailTemplate = emailService.generateLowStockEmailTemplate(
            supplier.name,
            product.productName,
            product.sku,
            totalQuantity,
            threshold,
            seller.companyName || seller.name
          );

          const emailSent = await emailService.sendLowStockAlert({
            to: supplier.email,
            subject: `🚨 URGENT: Low Stock Alert - ${product.productName} (SKU: ${product.sku})`,
            html: emailTemplate,
            productName: product.productName,
            sku: product.sku,
            currentStock: totalQuantity,
            threshold: threshold,
          });

          // Log the notification
          await storage.createNotification({
            sellerId: sellerId,
            productId: product.id,
            supplierId: product.supplierId,
            type: "low_stock_alert",
            status: emailSent ? "sent" : "failed",
            subject: `Low Stock Alert - ${product.productName}`,
            message: `Stock level: ${totalQuantity} units (at or below threshold of ${threshold} units)`,
          });

          console.log(`Low stock notification ${emailSent ? 'sent' : 'failed'} for product ${product.sku} to supplier ${supplier.email}`);
        }
      } catch (error) {
        console.error(`Failed to send notification for product ${product.sku}:`, error);
      }
    }
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
  // Get all sellers
  app.get("/api/sellers", async (req, res) => {
    try {
      const sellers = await storage.getAllSellers();
      res.json(sellers);
    } catch (error) {
      console.error("Error fetching sellers:", error);
      res.status(500).json({ error: "Failed to fetch sellers" });
    }
  });

  // Create new seller
  app.post("/api/sellers", async (req, res) => {
    try {
      const sellerData = insertSellerSchema.parse(req.body);
      const seller = await storage.createSeller(sellerData);
      
      // Create default settings for new seller
      await storage.createSettings({
        sellerId: seller.id,
        globalLowStockThreshold: 10,
        emailNotifications: false,
        autoReconcile: true,
      });
      
      res.json(seller);
    } catch (error) {
      console.error("Error creating seller:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: "Invalid seller data", details: error.message });
      } else {
        res.status(500).json({ error: "Failed to create seller" });
      }
    }
  });

  // Get all products (with optional seller filter)
  app.get("/api/products", async (req, res) => {
    try {
      const sellerId = req.query.sellerId as string;
      let seller;
      
      if (sellerId) {
        seller = await storage.getSellerById(sellerId);
        if (!seller) {
          return res.status(404).json({ error: "Seller not found" });
        }
      } else {
        seller = await getOrCreateDefaultSeller();
      }
      
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

      // Require sellerId from request body
      const sellerId = req.body.sellerId;
      console.log(`Upload request received with sellerId: ${sellerId}`);
      if (!sellerId) {
        return res.status(400).json({ error: "Seller ID is required" });
      }

      // Validate seller exists
      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        console.log(`Seller not found: ${sellerId}`);
        return res.status(404).json({ error: "Seller not found" });
      }
      console.log(`Upload processing for seller: ${seller.id} (${seller.name})`);

      const csvContent = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname;
      
      console.log(`Auto-parsing and processing file: ${filename}`);

      try {
        // Intelligent parsing
        const { data: parsedData, detectedFormat } = parseCSVIntelligently(csvContent, filename);
        
        // Create upload record with detected info
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

  // Get settings (with optional seller filter)
  app.get("/api/settings", async (req, res) => {
    try {
      const sellerId = req.query.sellerId as string;
      let seller;
      
      if (sellerId) {
        seller = await storage.getSellerById(sellerId);
        if (!seller) {
          return res.status(404).json({ error: "Seller not found" });
        }
      } else {
        seller = await getOrCreateDefaultSeller();
      }
      
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

  // Update product (for supplier assignments and manual edits)
  app.put("/api/products/:id", async (req, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      
      // Get the current product state before update
      const currentProduct = await storage.getProductById(req.params.id);
      if (!currentProduct) {
        return res.status(404).json({ error: "Product not found" });
      }
      
      const wasLowStock = currentProduct.isLowStock;
      const hadSupplier = !!currentProduct.supplierId;
      
      // Update the product
      const product = await storage.updateProduct(req.params.id, productData);
      
      // Get settings for email notifications
      const settings = await storage.getSettingsBySellerId(product.sellerId);
      
      // Recalculate low stock status based on updated values
      const updatedTotalQuantity = product.totalQuantity || 0;
      const updatedThreshold = product.lowStockThreshold || settings.globalLowStockThreshold;
      const isCurrentlyLowStock = updatedTotalQuantity <= updatedThreshold;
      
      // Update the low stock status if it changed
      if (product.isLowStock !== isCurrentlyLowStock) {
        await storage.updateProduct(req.params.id, { isLowStock: isCurrentlyLowStock });
        product.isLowStock = isCurrentlyLowStock;
      }
      
      // Check if we should send notification
      const becameLowStock = !wasLowStock && isCurrentlyLowStock;
      const supplierAdded = !hadSupplier && !!product.supplierId;
      const wasAlreadyLowAndHasSupplier = wasLowStock && isCurrentlyLowStock && !!product.supplierId;
      
      const shouldSendNotification = settings.emailNotifications && product.supplierId && (
        (becameLowStock) || // Became low stock and has supplier
        (supplierAdded && isCurrentlyLowStock) || // Supplier assigned to already low stock item
        (wasAlreadyLowAndHasSupplier && productData.totalQuantity !== undefined) // Manual update to already low stock item with supplier
      );

      console.log(`Product update notification check:`, {
        productSku: product.sku,
        emailNotifications: settings.emailNotifications,
        hasSupplier: !!product.supplierId,
        becameLowStock,
        supplierAdded,
        wasAlreadyLowAndHasSupplier,
        manualUpdate: productData.totalQuantity !== undefined,
        isCurrentlyLowStock,
        shouldSend: shouldSendNotification
      });

      if (shouldSendNotification) {
        try {
          const supplier = await storage.getSupplierById(product.supplierId!);
          const seller = await storage.getSellerById(product.sellerId);
          
          if (supplier && seller) {
            console.log(`Sending low stock notification for updated product ${product.sku} (${updatedTotalQuantity} <= ${updatedThreshold}) to supplier ${supplier.email}`);
            
            const emailTemplate = emailService.generateLowStockEmailTemplate(
              supplier.name,
              product.productName,
              product.sku,
              updatedTotalQuantity,
              updatedThreshold,
              seller.companyName || seller.name
            );

            const emailSent = await emailService.sendLowStockAlert({
              to: supplier.email,
              subject: `🚨 URGENT: Low Stock Alert - ${product.productName} (SKU: ${product.sku})`,
              html: emailTemplate,
              productName: product.productName,
              sku: product.sku,
              currentStock: updatedTotalQuantity,
              threshold: updatedThreshold,
            });

            // Log the notification
            await storage.createNotification({
              sellerId: product.sellerId,
              productId: product.id,
              supplierId: product.supplierId!,
              type: "low_stock_alert",
              status: emailSent ? "sent" : "failed",
              subject: `Low Stock Alert - ${product.productName}`,
              message: `Stock level: ${updatedTotalQuantity} units (at or below threshold of ${updatedThreshold} units)`,
            });

            console.log(`Low stock notification ${emailSent ? 'sent' : 'failed'} for product ${product.sku} to supplier ${supplier.email}`);
          }
        } catch (error) {
          console.error(`Failed to send notification for product ${product.sku}:`, error);
        }
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: "Invalid product data", details: error.message });
      } else {
        res.status(500).json({ error: "Failed to update product" });
      }
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

  // Supplier management routes
  app.get("/api/suppliers", async (req, res) => {
    try {
      const sellerId = req.query.sellerId as string;
      let seller;
      
      if (sellerId) {
        seller = await storage.getSellerById(sellerId);
        if (!seller) {
          return res.status(404).json({ error: "Seller not found" });
        }
      } else {
        seller = await getOrCreateDefaultSeller();
      }
      
      const suppliers = await storage.getSuppliersBySellerId(seller.id);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/suppliers", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.parse(req.body);
      const supplier = await storage.createSupplier(supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: "Invalid supplier data", details: error.message });
      } else {
        res.status(500).json({ error: "Failed to create supplier" });
      }
    }
  });

  app.put("/api/suppliers/:id", async (req, res) => {
    try {
      const supplierData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await storage.updateSupplier(req.params.id, supplierData);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      if (error instanceof Error && 'issues' in error) {
        res.status(400).json({ error: "Invalid supplier data", details: error.message });
      } else {
        res.status(500).json({ error: "Failed to update supplier" });
      }
    }
  });

  app.delete("/api/suppliers/:id", async (req, res) => {
    try {
      await storage.deleteSupplier(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ error: "Failed to delete supplier" });
    }
  });

  // Test email notification endpoint
  app.post("/api/test-notification", async (req, res) => {
    try {
      const sellerId = req.body.sellerId;
      if (!sellerId) {
        return res.status(400).json({ error: "Seller ID is required" });
      }

      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      const settings = await storage.getSettingsBySellerId(sellerId);
      if (!settings.emailNotifications) {
        return res.status(400).json({ error: "Email notifications are disabled" });
      }

      // Get a supplier to send test email to
      const suppliers = await storage.getSuppliersBySellerId(sellerId);
      if (suppliers.length === 0) {
        return res.status(400).json({ error: "No suppliers found for testing" });
      }

      const supplier = suppliers[0];

      console.log(`Sending test notification to supplier ${supplier.email}`);

      const emailTemplate = emailService.generateLowStockEmailTemplate(
        supplier.name,
        "Test Product",
        "TEST-SKU",
        5,
        10,
        seller.companyName || seller.name
      );

      const emailSent = await emailService.sendLowStockAlert({
        to: supplier.email,
        subject: `🧪 TEST: Low Stock Alert System - ${seller.companyName || seller.name}`,
        html: emailTemplate,
        productName: "Test Product",
        sku: "TEST-SKU",
        currentStock: 5,
        threshold: 10,
      });

      // Log the test notification
      await storage.createNotification({
        sellerId: sellerId,
        productId: null,
        supplierId: supplier.id,
        type: "test_notification",
        status: emailSent ? "sent" : "failed",
        subject: "Test Low Stock Alert",
        message: "Test notification to verify email system is working",
      });

      res.json({ 
        success: emailSent,
        message: emailSent ? "Test email sent successfully" : "Test email failed to send",
        emailConfigured: !!process.env.EMAIL_PASSWORD
      });

    } catch (error) {
      console.error("Test notification error:", error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Auto check low stock endpoint
  app.post("/api/auto-check-low-stock", async (req, res) => {
    try {
      console.log("Starting automatic low stock check...");
      await checkAndNotifyLowStock();
      res.json({ 
        success: true,
        message: "Automatic low stock check completed"
      });
    } catch (error) {
      console.error("Auto check error:", error);
      res.status(500).json({ error: "Auto check failed" });
    }
  });

  // Manual trigger for immediate low stock check
  app.post("/api/check-and-send-low-stock-emails", async (req, res) => {
    try {
      const sellerId = req.body.sellerId;
      if (!sellerId) {
        return res.status(400).json({ error: "Seller ID is required" });
      }

      const seller = await storage.getSellerById(sellerId);
      if (!seller) {
        return res.status(404).json({ error: "Seller not found" });
      }

      const settings = await storage.getSettingsBySellerId(sellerId);
      if (!settings.emailNotifications) {
        return res.status(400).json({ error: "Email notifications are disabled. Please enable them in settings first." });
      }

      console.log(`Manual low stock check triggered for seller ${sellerId}...`);
      
      const products = await storage.getProductsBySellerId(sellerId);
      const suppliers = await storage.getSuppliersBySellerId(sellerId);
      
      let emailsSent = 0;
      let emailsFailed = 0;
      const processedProducts = [];
      
      for (const product of products) {
        const totalQuantity = product.totalQuantity || 0;
        const threshold = product.lowStockThreshold || settings.globalLowStockThreshold;
        const isLowStock = totalQuantity <= threshold;
        
        if (isLowStock && product.supplierId) {
          const supplier = suppliers.find(s => s.id === product.supplierId);
          if (supplier) {
            try {
              console.log(`Sending manual low stock notification for product ${product.sku} (${totalQuantity} <= ${threshold}) to supplier ${supplier.email}`);
              
              const emailTemplate = emailService.generateLowStockEmailTemplate(
                supplier.name,
                product.productName,
                product.sku,
                totalQuantity,
                threshold,
                seller.companyName || seller.name
              );

              const emailSent = await emailService.sendLowStockAlert({
                to: supplier.email,
                subject: `🚨 MANUAL CHECK: Low Stock Alert - ${product.productName} (SKU: ${product.sku})`,
                html: emailTemplate,
                productName: product.productName,
                sku: product.sku,
                currentStock: totalQuantity,
                threshold: threshold,
              });

              if (emailSent) {
                emailsSent++;
                // Log the notification
                await storage.createNotification({
                  sellerId: sellerId,
                  productId: product.id,
                  supplierId: product.supplierId,
                  type: "manual_low_stock_alert",
                  status: "sent",
                  subject: `Manual Low Stock Alert - ${product.productName}`,
                  message: `Manual check notification: Stock level: ${totalQuantity} units (at or below threshold of ${threshold} units)`,
                });
                
                console.log(`✅ Manual low stock notification sent for product ${product.sku} to supplier ${supplier.email}`);
              } else {
                emailsFailed++;
                console.log(`❌ Manual low stock notification failed for product ${product.sku} to supplier ${supplier.email}`);
              }
              
              processedProducts.push({
                sku: product.sku,
                productName: product.productName,
                currentStock: totalQuantity,
                threshold: threshold,
                supplier: supplier.name,
                supplierEmail: supplier.email,
                emailSent: emailSent
              });
              
            } catch (error) {
              emailsFailed++;
              console.error(`Failed to send manual notification for product ${product.sku}:`, error);
            }
          }
        }
      }
      
      res.json({ 
        success: true,
        message: `Manual low stock check completed. Sent ${emailsSent} emails, ${emailsFailed} failed.`,
        emailsSent,
        emailsFailed,
        processedProducts,
        emailConfigured: !!process.env.EMAIL_PASSWORD || !!process.env.EMAIL_USER
      });

    } catch (error) {
      console.error("Manual low stock check error:", error);
      res.status(500).json({ error: "Manual low stock check failed" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up periodic automatic checking every 30 minutes
  setInterval(async () => {
    console.log("Running scheduled low stock check...");
    await checkAndNotifyLowStock();
  }, 30 * 60 * 1000); // 30 minutes
  
  return httpServer;
}
