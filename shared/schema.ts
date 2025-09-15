import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users/Sellers table for multi-tenancy
export const sellers = pgTable("sellers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  contactPerson: text("contact_person"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Database tables
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  sku: text("sku").notNull(),
  productName: text("product_name").notNull(),
  channels: jsonb("channels").notNull().$type<Array<{ channel: "Amazon" | "Shopify"; quantity: number }>>(),
  totalQuantity: integer("total_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  isLowStock: boolean("is_low_stock").notNull().default(false),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  forecastedStock: decimal("forecasted_stock", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const csvUploads = pgTable("csv_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  filename: text("filename").notNull(),
  channel: text("channel").notNull(),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("pending"),
  productsCount: integer("products_count"),
  errorMessage: text("error_message"),
});

// Historical stock data for forecasting
export const stockHistory = pgTable("stock_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  totalQuantity: integer("total_quantity").notNull(),
  channels: jsonb("channels").notNull().$type<Array<{ channel: "Amazon" | "Shopify"; quantity: number }>>(),
  recordedAt: timestamp("recorded_at").default(sql`now()`),
});

// Notification tracking
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  productId: varchar("product_id").references(() => products.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  type: text("type").notNull().default("low_stock_alert"),
  status: text("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").default(sql`now()`),
  subject: text("subject"),
  message: text("message"),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => sellers.id),
  globalLowStockThreshold: integer("global_low_stock_threshold").notNull().default(10),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  autoReconcile: boolean("auto_reconcile").notNull().default(true),
  smtpEmail: text("smtp_email"),
  smtpPassword: text("smtp_password"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Zod schemas for validation
export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCsvUploadSchema = createInsertSchema(csvUploads).omit({
  id: true,
  uploadedAt: true,
  processedAt: true,
});

export const insertStockHistorySchema = createInsertSchema(stockHistory).omit({
  id: true,
  recordedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// API schemas for frontend
export const sellerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  companyName: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const supplierSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  name: z.string(),
  email: z.string().email(),
  contactPerson: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  sku: z.string(),
  productName: z.string(),
  channels: z.array(z.object({
    channel: z.enum(["Amazon", "Shopify"]),
    quantity: z.number(),
  })),
  totalQuantity: z.number(),
  lowStockThreshold: z.number().default(10),
  isLowStock: z.boolean(),
  supplierId: z.string().optional(),
  forecastedStock: z.number().optional(),
  notificationsSent: z.number().optional(),
});

export const csvUploadSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  filename: z.string(),
  channel: z.enum(["Amazon", "Shopify"]),
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "error"]),
  productsCount: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const stockHistorySchema = z.object({
  id: z.string(),
  productId: z.string(),
  sellerId: z.string(),
  totalQuantity: z.number(),
  channels: z.array(z.object({
    channel: z.enum(["Amazon", "Shopify"]),
    quantity: z.number(),
  })),
  recordedAt: z.string(),
});

export const notificationSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  productId: z.string(),
  supplierId: z.string(),
  type: z.string().default("low_stock_alert"),
  status: z.string().default("sent"),
  sentAt: z.string(),
  subject: z.string().optional(),
  message: z.string().optional(),
});

export const settingsSchema = z.object({
  id: z.string(),
  sellerId: z.string(),
  globalLowStockThreshold: z.number().min(0).max(1000).default(10),
  emailNotifications: z.boolean().default(false),
  autoReconcile: z.boolean().default(true),
  smtpEmail: z.string().optional(),
  smtpPassword: z.string().optional(),
});

export type Seller = z.infer<typeof sellerSchema>;
export type Supplier = z.infer<typeof supplierSchema>;
export type Product = z.infer<typeof productSchema>;
export type CsvUpload = z.infer<typeof csvUploadSchema>;
export type StockHistory = z.infer<typeof stockHistorySchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type InsertSeller = z.infer<typeof insertSellerSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type InsertStockHistory = z.infer<typeof insertStockHistorySchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
