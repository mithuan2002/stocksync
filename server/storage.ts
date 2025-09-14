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

// Initialize database connection with fallback
let db: any = null;
let useDatabase = false;

try {
  if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
    useDatabase = true;
    console.log('Connected to Neon database');
  } else {
    console.log('No DATABASE_URL found, using in-memory storage');
  }
} catch (error) {
  console.log('Database connection failed, falling back to in-memory storage:', error);
  useDatabase = false;
}

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
  createSettings(settingsData: InsertSettings): Promise<Settings>;
}

// In-memory storage fallback
class InMemoryStorage implements IStorage {
  private sellers: Map<string, Seller> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private products: Map<string, Product> = new Map();
  private csvUploads: Map<string, CsvUpload> = new Map();
  private settingsMap: Map<string, Settings> = new Map();
  private stockHistoryMap: Map<string, StockHistory[]> = new Map();
  private notificationsMap: Map<string, Notification> = new Map();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Sellers
  async getAllSellers(): Promise<Seller[]> {
    return Array.from(this.sellers.values());
  }

  async getSellerById(id: string): Promise<Seller | undefined> {
    return this.sellers.get(id);
  }

  async getSellerByEmail(email: string): Promise<Seller | undefined> {
    return Array.from(this.sellers.values()).find(s => s.email === email);
  }

  async createSeller(seller: InsertSeller): Promise<Seller> {
    const id = this.generateId();
    const newSeller: Seller = {
      id,
      ...seller,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sellers.set(id, newSeller);
    return newSeller;
  }

  async updateSeller(id: string, seller: Partial<InsertSeller>): Promise<Seller> {
    const existing = this.sellers.get(id);
    if (!existing) throw new Error('Seller not found');
    
    const updated = { ...existing, ...seller, updatedAt: new Date().toISOString() };
    this.sellers.set(id, updated);
    return updated;
  }

  async deleteSeller(id: string): Promise<void> {
    this.sellers.delete(id);
  }

  // Suppliers
  async getSuppliersBySellerId(sellerId: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(s => s.sellerId === sellerId);
  }

  async getSupplierById(id: string): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.generateId();
    const newSupplier: Supplier = {
      id,
      ...supplier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: string, supplier: Partial<InsertSupplier>): Promise<Supplier> {
    const existing = this.suppliers.get(id);
    if (!existing) throw new Error('Supplier not found');
    
    const updated = { ...existing, ...supplier, updatedAt: new Date().toISOString() };
    this.suppliers.set(id, updated);
    return updated;
  }

  async deleteSupplier(id: string): Promise<void> {
    this.suppliers.delete(id);
  }

  // Products
  async getProductsBySellerId(sellerId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.sellerId === sellerId);
  }

  async getProductBySku(sellerId: string, sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(p => p.sellerId === sellerId && p.sku === sku);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.generateId();
    const newProduct: Product = {
      id,
      ...product,
      notificationsSent: 0,
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const existing = this.products.get(id);
    if (!existing) throw new Error('Product not found');
    
    const updated = { ...existing, ...product };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<void> {
    this.products.delete(id);
  }

  // CSV Uploads
  async getCsvUploadsBySellerId(sellerId: string): Promise<CsvUpload[]> {
    return Array.from(this.csvUploads.values()).filter(u => u.sellerId === sellerId);
  }

  async getCsvUpload(id: string): Promise<CsvUpload | undefined> {
    return this.csvUploads.get(id);
  }

  async createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload> {
    const id = this.generateId();
    const newUpload: CsvUpload = {
      id,
      ...upload,
      uploadedAt: new Date().toISOString(),
    };
    this.csvUploads.set(id, newUpload);
    return newUpload;
  }

  async updateCsvUpload(id: string, upload: Partial<InsertCsvUpload>): Promise<CsvUpload> {
    const existing = this.csvUploads.get(id);
    if (!existing) throw new Error('Upload not found');
    
    const updated = { ...existing, ...upload };
    this.csvUploads.set(id, updated);
    return updated;
  }

  // Stock History
  async getStockHistoryByProductId(productId: string, limit?: number): Promise<StockHistory[]> {
    const history = this.stockHistoryMap.get(productId) || [];
    return limit ? history.slice(0, limit) : history;
  }

  async createStockHistory(history: InsertStockHistory): Promise<StockHistory> {
    const id = this.generateId();
    const newHistory: StockHistory = {
      id,
      ...history,
      recordedAt: new Date().toISOString(),
    };
    
    const existing = this.stockHistoryMap.get(history.productId) || [];
    existing.unshift(newHistory);
    this.stockHistoryMap.set(history.productId, existing);
    
    return newHistory;
  }

  // Notifications
  async getNotificationsBySellerId(sellerId: string): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values()).filter(n => n.sellerId === sellerId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.generateId();
    const newNotification: Notification = {
      id,
      ...notification,
      sentAt: new Date().toISOString(),
    };
    this.notificationsMap.set(id, newNotification);
    return newNotification;
  }

  async getNotificationsByProductId(productId: string): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values()).filter(n => n.productId === productId);
  }

  // Settings
  async getSettingsBySellerId(sellerId: string): Promise<Settings> {
    let settings = this.settingsMap.get(sellerId);
    if (!settings) {
      settings = {
        id: this.generateId(),
        sellerId,
        globalLowStockThreshold: 10,
        emailNotifications: false,
        autoReconcile: true,
      };
      this.settingsMap.set(sellerId, settings);
    }
    return settings;
  }

  async updateSettings(sellerId: string, newSettings: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettingsBySellerId(sellerId);
    const updated = { ...existing, ...newSettings };
    this.settingsMap.set(sellerId, updated);
    return updated;
  }

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const id = this.generateId();
    const settings: Settings = { id, ...settingsData };
    this.settingsMap.set(settingsData.sellerId, settings);
    return settings;
  }
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

  async createSettings(settingsData: InsertSettings): Promise<Settings> {
    const result = await db.insert(settings).values(settingsData).returning();
    return result[0];
  }
}

// Export the appropriate storage implementation
export const storage: IStorage = useDatabase ? new DatabaseStorage() : new InMemoryStorage();

console.log(`Using ${useDatabase ? 'database' : 'in-memory'} storage`);

// Add test data for in-memory storage if needed
if (!useDatabase) {
  setTimeout(async () => {
    // Create a default seller for testing
    try {
      let seller = await storage.getSellerByEmail('demo@seller.com');
      if (!seller) {
        seller = await storage.createSeller({
          email: 'demo@seller.com',
          name: 'Demo Seller',
          companyName: 'Demo Company'
        });
        console.log('Created default seller for in-memory storage');
      }
    } catch (error) {
      console.log('Error creating default seller:', error);
    }
  }, 100);
}