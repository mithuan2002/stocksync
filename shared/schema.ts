import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Database tables
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  productName: text("product_name").notNull(),
  channels: jsonb("channels").notNull().$type<Array<{ channel: "Amazon" | "Shopify"; quantity: number }>>(),
  totalQuantity: integer("total_quantity").notNull().default(0),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  isLowStock: boolean("is_low_stock").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const csvUploads = pgTable("csv_uploads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: text("filename").notNull(),
  channel: text("channel").notNull(),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
  processedAt: timestamp("processed_at"),
  status: text("status").notNull().default("pending"),
  productsCount: integer("products_count"),
  errorMessage: text("error_message"),
});

export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  globalLowStockThreshold: integer("global_low_stock_threshold").notNull().default(10),
  emailNotifications: boolean("email_notifications").notNull().default(false),
  autoReconcile: boolean("auto_reconcile").notNull().default(true),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Zod schemas for validation
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

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// API schemas for frontend
export const productSchema = z.object({
  id: z.string(),
  sku: z.string(),
  productName: z.string(),
  channels: z.array(z.object({
    channel: z.enum(["Amazon", "Shopify"]),
    quantity: z.number(),
  })),
  totalQuantity: z.number(),
  lowStockThreshold: z.number().default(10),
  isLowStock: z.boolean(),
});

export const csvUploadSchema = z.object({
  id: z.string(),
  filename: z.string(),
  channel: z.enum(["Amazon", "Shopify"]),
  uploadedAt: z.string(),
  processedAt: z.string().optional(),
  status: z.enum(["pending", "processing", "completed", "error"]),
  productsCount: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const settingsSchema = z.object({
  globalLowStockThreshold: z.number().min(0).max(1000).default(10),
  emailNotifications: z.boolean().default(false),
  autoReconcile: z.boolean().default(true),
});

export type Product = z.infer<typeof productSchema>;
export type CsvUpload = z.infer<typeof csvUploadSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertCsvUpload = z.infer<typeof insertCsvUploadSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
