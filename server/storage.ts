import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import { 
  products, 
  csvUploads, 
  settings,
  type InsertProduct,
  type InsertCsvUpload,
  type InsertSettings,
  type Product,
  type CsvUpload,
  type Settings
} from "@shared/schema";
import { randomUUID } from "crypto";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // Products
  getAllProducts(): Promise<Product[]>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  
  // CSV Uploads
  getAllCsvUploads(): Promise<CsvUpload[]>;
  getCsvUpload(id: string): Promise<CsvUpload | undefined>;
  createCsvUpload(upload: InsertCsvUpload): Promise<CsvUpload>;
  updateCsvUpload(id: string, upload: Partial<InsertCsvUpload>): Promise<CsvUpload>;
  
  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(newSettings: InsertSettings): Promise<Settings>;
}

export class DatabaseStorage implements IStorage {
  async getAllProducts(): Promise<Product[]> {
    const result = await db.select().from(products).orderBy(desc(products.createdAt));
    return result.map(p => ({
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
    }));
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.sku, sku)).limit(1);
    if (result.length === 0) return undefined;
    
    const p = result[0];
    return {
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
    };
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values({
      ...product,
      id: randomUUID(),
    }).returning();
    
    const p = result[0];
    return {
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
    };
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product> {
    const result = await db.update(products)
      .set({ ...product, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    
    const p = result[0];
    return {
      id: p.id,
      sku: p.sku,
      productName: p.productName,
      channels: p.channels as Array<{ channel: "Amazon" | "Shopify"; quantity: number }>,
      totalQuantity: p.totalQuantity,
      lowStockThreshold: p.lowStockThreshold,
      isLowStock: p.isLowStock,
    };
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async getAllCsvUploads(): Promise<CsvUpload[]> {
    const result = await db.select().from(csvUploads).orderBy(desc(csvUploads.uploadedAt));
    return result.map(u => ({
      id: u.id,
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
    const result = await db.insert(csvUploads).values({
      ...upload,
      id: randomUUID(),
    }).returning();
    
    const u = result[0];
    return {
      id: u.id,
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
      filename: u.filename,
      channel: u.channel as "Amazon" | "Shopify",
      uploadedAt: u.uploadedAt?.toISOString() || "",
      processedAt: u.processedAt?.toISOString(),
      status: u.status as "pending" | "processing" | "completed" | "error",
      productsCount: u.productsCount || undefined,
      errorMessage: u.errorMessage || undefined,
    };
  }

  async getSettings(): Promise<Settings> {
    const result = await db.select().from(settings).limit(1);
    
    if (result.length === 0) {
      // Create default settings
      const defaultSettings = {
        globalLowStockThreshold: 10,
        emailNotifications: false,
        autoReconcile: true,
      };
      
      await db.insert(settings).values({
        id: randomUUID(),
        ...defaultSettings,
      });
      
      return defaultSettings;
    }
    
    const s = result[0];
    return {
      globalLowStockThreshold: s.globalLowStockThreshold,
      emailNotifications: s.emailNotifications,
      autoReconcile: s.autoReconcile,
    };
  }

  async updateSettings(newSettings: InsertSettings): Promise<Settings> {
    const existing = await db.select().from(settings).limit(1);
    
    if (existing.length === 0) {
      await db.insert(settings).values({
        id: randomUUID(),
        ...newSettings,
      });
    } else {
      await db.update(settings)
        .set({ ...newSettings, updatedAt: new Date() })
        .where(eq(settings.id, existing[0].id));
    }
    
    return {
      globalLowStockThreshold: newSettings.globalLowStockThreshold,
      emailNotifications: newSettings.emailNotifications,
      autoReconcile: newSettings.autoReconcile,
    };
  }
}

export const storage = new DatabaseStorage();
