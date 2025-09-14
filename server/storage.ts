import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, count } from "drizzle-orm";
import { 
  products, 
  csvUploads, 
  settings,
  sellers,
  suppliers,
  stockHistory,
  notifications,
  type InsertProduct,
  type InsertCsvUpload,
  type InsertSettings,
  type InsertSeller,
  type InsertSupplier,
  type InsertStockHistory,
  type InsertNotification,
  type Product,
  type CsvUpload,
  type Settings,
  type Seller,
  type Supplier,
  type StockHistory,
  type Notification
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // Sellers
  getAllSellers(): Promise<Seller[]>;
  getSellerById(id: string): Promise<Seller | undefined>;
  getSellerByEmail(email: string): Promise<Seller | undefined>;
  createSeller(seller: InsertSeller): Promise<Seller>;
  updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller>;
  deleteSeller(id: string): Promise<void>;
  
  // Suppliers
  getSuppliersBySellerId(sellerId: string): Promise<Supplier[]>;
  getSupplierById(id: string): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier>;
  deleteSupplier(id: string): Promise<void>;
  
  // Products
  getProductsBySellerId(sellerId: string): Promise<Product[]>;
  getProductBySku(sellerId: string, sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // CSV Uploads
  getCsvUploadsBySellerId(sellerId: string): Promise<CsvUpload[]>;
  getCsvUpload(id: string): Promise<CsvUpload | undefined>;
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  updateCsvUpload(id: string, upload: Partial<InsertCsvUpload>): Promise<CsvUpload>;
  
  // Stock History
  getStockHistoryByProductId(productId: string, limit?: number): Promise<StockHistory[]>;
  createStockHistory(history: InsertStockHistory): Promise<StockHistory>;
  
  // Notifications
  getNotificationsBySellerId(sellerId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsByProductId(productId: string): Promise<Notification[]>;
  
  // Settings
  getSettingsBySellerId(sellerId: string): Promise<Settings>;
  updateSettings(sellerId: string, newSettings: Partial<InsertSettings>): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  // Sellers
  async getAllSellers(): Promise<Seller[]> {
    const result = await db.select().from(sellers).orderBy(desc(sellers.createdAt));
    return result.map(s => ({
      id: s.id,
      email: s.email,
      name: s.name,
      companyName: s.companyName || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    }));
  }

  async getSellerById(id: string): Promise<Seller | undefined> {
    const result = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const s = result[0];
    return {
      id: s.id,
      email: s.email,
      name: s.name,
      companyName: s.companyName || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async getSellerByEmail(email: string): Promise<Seller | undefined> {
    const result = await db.select().from(sellers).where(eq(sellers.email, email)).limit(1);
    if (result.length === 0) return undefined;
    
    const s = result[0];
    return {
      id: s.id,
      email: s.email,
      name: s.name,
      companyName: s.companyName || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const result = await db.insert(sellers).values(seller).returning();
    const s = result[0];
    return {
      id: s.id,
      email: s.email,
      name: s.name,
      companyName: s.companyName || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller> {
    const result = await db.update(sellers)
      .set(seller)
      .where(eq(sellers.id, id))
      .returning();
    
    const s = result[0];
    return {
      id: s.id,
      email: s.email,
      name: s.name,
      companyName: s.companyName || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async deleteSeller(id: string): Promise<void> {
    await db.delete(sellers).where(eq(sellers.id, id));
  }

  // Suppliers
  async getSuppliersBySellerId(sellerId: string): Promise<Supplier[]> {
    const result = await db.select().from(suppliers)
      .where(eq(suppliers.sellerId, sellerId))
      .orderBy(desc(suppliers.createdAt));
    return result.map(s => ({
      id: s.id,
      sellerId: s.sellerId,
      name: s.name,
      email: s.email,
      contactPerson: s.contactPerson || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    }));
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const s = result[0];
    return {
      id: s.id,
      sellerId: s.sellerId,
      name: s.name,
      email: s.email,
      contactPerson: s.contactPerson || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values(supplier).returning();
    const s = result[0];
    return {
      id: s.id,
      sellerId: s.sellerId,
      name: s.name,
      email: s.email,
      contactPerson: s.contactPerson || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const result = await db.update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    
    const s = result[0];
    return {
      id: s.id,
      sellerId: s.sellerId,
      name: s.name,
      email: s.email,
      contactPerson: s.contactPerson || undefined,
      createdAt: s.createdAt?.toISOString(),
      updatedAt: s.updatedAt?.toISOString(),
    };
  }

  async deleteSupplier(id: string): Promise<void> {
    await db.delete(suppliers).where(eq(suppliers.id, id));
  }

  // Products
  async getProductsBySellerId(sellerId: string): Promise<Product[]> {
    const result = await db.select({
      product: products,
      notificationCount: count(notifications.id)
    })
    .from(products)
    .leftJoin(notifications, eq(notifications.productId, products.id))
    .where(eq(products.sellerId, sellerId))
    .groupBy(products.id)
    .orderBy(desc(products.createdAt));

    return result.map(({ product: p, notificationCount }) => ({
      id: p.id,
      sellerId: p.sellerId,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
      supplierId: p.supplierId || undefined,
      forecastedStock: p.forecastedStock ? Number(p.forecastedStock) : undefined,
      notificationsSent: notificationCount || 0,
    }));
  }

  async getProductBySku(sellerId: string, sku: string): Promise<Product | undefined> {
    const result = await db.select({
      product: products,
      notificationCount: count(notifications.id)
    })
    .from(products)
    .leftJoin(notifications, eq(notifications.productId, products.id))
    .where(and(eq(products.sellerId, sellerId), eq(products.sku, sku)))
    .groupBy(products.id)
    .limit(1);

    if (result.length === 0) return undefined;
    
    const { product: p, notificationCount } = result[0];
    return {
      id: p.id,
      sellerId: p.sellerId,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
      supplierId: p.supplierId || undefined,
      forecastedStock: p.forecastedStock ? Number(p.forecastedStock) : undefined,
      notificationsSent: notificationCount || 0,
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values({
      ...product,
      channels: product.channels as any
    }).returning();
    
    const p = result[0];
    return {
      id: p.id,
      sellerId: p.sellerId,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
      supplierId: p.supplierId || undefined,
      forecastedStock: p.forecastedStock ? Number(p.forecastedStock) : undefined,
      notificationsSent: 0,
    };
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const updateData: any = product.channels ? {
      ...product,
      channels: product.channels as any
    } : product;
    
    const result = await db.update(products)
      .set(updateData)
      .where(eq(products.id, id))
      .returning();
    
    const p = result[0];
    // Get notification count
    const notificationCountResult = await db.select({ count: count() })
      .from(notifications)
      .where(eq(notifications.productId, id));

    return {
      id: p.id,
      sellerId: p.sellerId,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
      supplierId: p.supplierId || undefined,
      forecastedStock: p.forecastedStock ? Number(p.forecastedStock) : undefined,
      notificationsSent: notificationCountResult[0]?.count || 0,
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // CSV Uploads
  async getCsvUploadsBySellerId(sellerId: string): Promise<CsvUpload[]> {
    const result = await db.select().from(csvUploads)
      .where(eq(csvUploads.sellerId, sellerId))
      .orderBy(desc(csvUploads.uploadedAt));
    return result.map(u => ({
      id: u.id,
      sellerId: u.sellerId,
      filename: u.filename,
      channel: u.channel as "Amazon" | "Shopify",
      uploadedAt: u.uploadedAt?.toISOString() || "",
      processedAt: u.processedAt?.toISOString(),
      status: u.status as "pending" | "processing" | "completed" | "error",
      productsCount: u.productsCount || undefined,
      errorMessage: u.errorMessage || undefined,
    }));
  }

  async getCsvUpload(id: string): Promise<CsvUpload | undefined> {
    const result = await db.select().from(csvUploads).where(eq(csvUploads.id, id)).limit(1);
    if (result.length === 0) return undefined;
    
    const u = result[0];
    return {
      id: u.id,
      sellerId: u.sellerId,
      filename: u.filename,
      channel: u.channel as "Amazon" | "Shopify",
      uploadedAt: u.uploadedAt?.toISOString() || "",
      processedAt: u.processedAt?.toISOString(),
      status: u.status as "pending" | "processing" | "completed" | "error",
      productsCount: u.productsCount || undefined,
      errorMessage: u.errorMessage || undefined,
    };
  }

  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const result = await db.insert(csvUploads).values(upload).returning();
    
    const u = result[0];
    return {
      id: u.id,
      sellerId: u.sellerId,
      filename: u.filename,
      channel: u.channel as "Amazon" | "Shopify",
      uploadedAt: u.uploadedAt?.toISOString() || "",
      processedAt: u.processedAt?.toISOString(),
      status: u.status as "pending" | "processing" | "completed" | "error",
      productsCount: u.productsCount || undefined,
      errorMessage: u.errorMessage || undefined,
    };
  }

  async updateCsvUpload(id: string, upload: Partial<InsertCsvUpload>): Promise<CsvUpload> {
    const result = await db.update(csvUploads)
      .set(upload)
      .where(eq(csvUploads.id, id))
      .returning();
    
    const u = result[0];
    return {
      id: u.id,
      sellerId: u.sellerId,
      filename: u.filename,
      channel: u.channel as "Amazon" | "Shopify",
      uploadedAt: u.uploadedAt?.toISOString() || "",
      processedAt: u.processedAt?.toISOString(),
      status: u.status as "pending" | "processing" | "completed" | "error",
      productsCount: u.productsCount || undefined,
      errorMessage: u.errorMessage || undefined,
    };
  }

  // Stock History
  async getStockHistoryByProductId(productId: string, limit: number = 10): Promise<StockHistory[]> {
    const result = await db.select().from(stockHistory)
      .where(eq(stockHistory.productId, productId))
      .orderBy(desc(stockHistory.recordedAt))
      .limit(limit);
    
    return result.map(h => ({
      id: h.id,
      productId: h.productId,
      sellerId: h.sellerId,
      totalQuantity: h.totalQuantity,
      channels: h.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      recordedAt: h.recordedAt?.toISOString() || "",
    }));
  }

  async createStockHistory(history: InsertStockHistory): Promise<StockHistory> {
    const result = await db.insert(stockHistory).values({
      ...history,
      channels: history.channels as any
    }).returning();
    const h = result[0];
    return {
      id: h.id,
      productId: h.productId,
      sellerId: h.sellerId,
      totalQuantity: h.totalQuantity,
      channels: h.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      recordedAt: h.recordedAt?.toISOString() || "",
    };
  }

  // Notifications
  async getNotificationsBySellerId(sellerId: string): Promise<Notification[]> {
    const result = await db.select().from(notifications)
      .where(eq(notifications.sellerId, sellerId))
      .orderBy(desc(notifications.sentAt));
    
    return result.map(n => ({
      id: n.id,
      sellerId: n.sellerId,
      productId: n.productId,
      supplierId: n.supplierId,
      type: n.type,
      status: n.status,
      sentAt: n.sentAt?.toISOString() || "",
      subject: n.subject || undefined,
      message: n.message || undefined,
    }));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values(notification).returning();
    const n = result[0];
    return {
      id: n.id,
      sellerId: n.sellerId,
      productId: n.productId,
      supplierId: n.supplierId,
      type: n.type,
      status: n.status,
      sentAt: n.sentAt?.toISOString() || "",
      subject: n.subject || undefined,
      message: n.message || undefined,
    };
  }

  async getNotificationsByProductId(productId: string): Promise<Notification[]> {
    const result = await db.select().from(notifications)
      .where(eq(notifications.productId, productId))
      .orderBy(desc(notifications.sentAt));
    
    return result.map(n => ({
      id: n.id,
      sellerId: n.sellerId,
      productId: n.productId,
      supplierId: n.supplierId,
      type: n.type,
      status: n.status,
      sentAt: n.sentAt?.toISOString() || "",
      subject: n.subject || undefined,
      message: n.message || undefined,
    }));
  }

  // Settings
  async getSettingsBySellerId(sellerId: string): Promise<Settings> {
    const result = await db.select().from(settings)
      .where(eq(settings.sellerId, sellerId))
      .limit(1);
    
    if (result.length === 0) {
      // Create default settings for new seller
      const defaultSettings = {
        sellerId,
        globalLowStockThreshold: 10,
        emailNotifications: false,
        autoReconcile: true,
      };
      
      const created = await db.insert(settings).values(defaultSettings).returning();
      const s = created[0];
      return {
        id: s.id,
        sellerId: s.sellerId,
        globalLowStockThreshold: s.globalLowStockThreshold,
        emailNotifications: s.emailNotifications,
        autoReconcile: s.autoReconcile,
        smtpEmail: s.smtpEmail || undefined,
        smtpPassword: s.smtpPassword || undefined,
      };
    }
    
    const s = result[0];
    return {
      id: s.id,
      sellerId: s.sellerId,
      globalLowStockThreshold: s.globalLowStockThreshold,
      emailNotifications: s.emailNotifications,
      autoReconcile: s.autoReconcile,
      smtpEmail: s.smtpEmail || undefined,
      smtpPassword: s.smtpPassword || undefined,
    };
  }

  async updateSettings(sellerId: string, newSettings: Partial<InsertSettings>): Promise<Settings> {
    const result = await db.update(settings)
      .set(newSettings)
      .where(eq(settings.sellerId, sellerId))
      .returning();
    
    const s = result[0];
    return {
      id: s.id,
      sellerId: s.sellerId,
      globalLowStockThreshold: s.globalLowStockThreshold,
      emailNotifications: s.emailNotifications,
      autoReconcile: s.autoReconcile,
      smtpEmail: s.smtpEmail || undefined,
      smtpPassword: s.smtpPassword || undefined,
    };
  }
}

export const storage: IStorage = new DatabaseStorage();