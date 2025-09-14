import { z } from "zod";

// Product inventory schema
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

// CSV upload data schema
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

// Settings schema
export const settingsSchema = z.object({
  globalLowStockThreshold: z.number().min(0).max(1000).default(10),
  emailNotifications: z.boolean().default(false),
  autoReconcile: z.boolean().default(true),
});

export type Product = z.infer<typeof productSchema>;
export type CsvUpload = z.infer<typeof csvUploadSchema>;
export type Settings = z.infer<typeof settingsSchema>;
