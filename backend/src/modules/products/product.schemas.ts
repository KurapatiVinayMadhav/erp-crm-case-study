import { z } from "zod";
import { StockMovementType } from "@prisma/client";

const toOptionalUndefined = <T,>(schema: z.ZodType<T>) =>
  z
    .union([schema, z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined));

/**
 * Helpers shared by create/update schemas so both keep identical coercions.
 */
const productFields = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters").max(160),
  sku: z
    .string()
    .min(2, "SKU/code must be at least 2 characters")
    .max(64)
    .transform((v) => v.trim().toUpperCase()),
  category: z.string().min(2, "Category is required").max(80),
  unitPrice: z.coerce
    .number({ message: "Unit price must be a number" })
    .nonnegative("Unit price cannot be negative")
    .max(1_000_000_000, "Unit price too large"),
  currentStock: z.coerce
    .number({ message: "Current stock must be a number" })
    .int("Stock must be a whole number")
    .nonnegative("Stock cannot be negative"),
  minStock: z.coerce
    .number({ message: "Minimum stock must be a number" })
    .int("Minimum stock must be a whole number")
    .nonnegative("Minimum stock cannot be negative")
    .default(0),
  location: toOptionalUndefined(z.string().max(120)),
});

export const productCreateSchema = productFields;

export const productUpdateSchema = productFields.partial();

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  lowStock: z.union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")]).optional(),
});

export const stockMovementCreateSchema = z
  .object({
    productId: z.string().min(1, "Product is required"),
    quantityChanged: z.coerce
      .number({ message: "Quantity must be a number" })
      .int("Quantity must be a whole number")
      .positive("Quantity must be at least 1"),
    type: z.nativeEnum(StockMovementType),
    reason: z.string().min(3, "A reason is required (min 3 characters)").max(240),
  })
  .superRefine((value, ctx) => {
    if (value.type === StockMovementType.IN && !value.reason.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "A reason is required for stock-in",
      });
    }
  });

export const stockQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  productId: z.string().optional(),
  type: z.nativeEnum(StockMovementType).optional(),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type StockMovementCreateInput = z.infer<typeof stockMovementCreateSchema>;