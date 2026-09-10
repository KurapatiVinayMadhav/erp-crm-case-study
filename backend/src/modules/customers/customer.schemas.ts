import { z } from "zod";
import { CustomerStatus, CustomerType } from "@prisma/client";

const mobileRegex = /^[0-9+\-() ]{7,15}$/;

export const customerCreateSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters").max(120),
  mobile: z
    .string()
    .regex(mobileRegex, "Mobile number looks invalid")
    .max(20),
  email: z
    .union([z.string().email("Invalid email address"), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  businessName: z.string().min(1, "Business name is required").max(160),
  gstNumber: z
    .union([
      z
        .string()
        .regex(/^[0-9A-Z]{15}$/, "GST number must be exactly 15 alphanumeric characters"),
      z.literal(""),
    ])
    .optional()
    .transform((v) => (v ? v.toUpperCase() : undefined)),
  type: z.nativeEnum(CustomerType).default(CustomerType.RETAIL),
  address: z
    .union([z.string().max(500), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
  followUpDate: z
    .union([z.string().datetime({ offset: true, message: "Invalid follow-up date" }), z.literal("")])
    .optional()
    .nullish()
    .transform((v) => (v ? new Date(v) : null)),
  notes: z
    .union([z.string().max(2000), z.literal("")])
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export const customerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(160).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  type: z.nativeEnum(CustomerType).optional(),
});

export const followUpCreateSchema = z.object({
  note: z.string().min(1, "Follow-up note cannot be empty").max(2000),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type FollowUpCreateInput = z.infer<typeof followUpCreateSchema>;