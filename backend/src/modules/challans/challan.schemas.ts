import { z } from "zod";
import { ChallanStatus } from "@prisma/client";

export const challanItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.coerce
    .number({ message: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be at least 1")
    .max(100_000, "Quantity too large"),
});

export const challanCreateSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  status: z.nativeEnum(ChallanStatus).optional(),
  items: z
    .array(challanItemSchema)
    .min(1, "A challan must contain at least one line item")
    .max(100, "Too many line items"),
});

export const challanQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  status: z.nativeEnum(ChallanStatus).optional(),
  customerId: z.string().optional(),
  search: z.string().trim().max(120).optional(),
});

export type ChallanCreateInput = z.infer<typeof challanCreateSchema>;