import { z } from "zod";
import { DOSAGE_FORMS, MOVEMENT_REASONS, MOVEMENT_TYPES, USER_ROLES } from "@/lib/constants";

// Auth Schemas
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// Medicine Schemas
export const medicineSchema = z.object({
  name: z.string().trim().min(1, "Medicine name is required").max(100),
  generic_name: z.string().trim().max(100).optional().nullable(),
  category_id: z.string().uuid("Invalid category ID").optional().nullable(),
  strength: z.string().trim().min(1, "Strength is required (e.g. 500mg, 100ml)").max(50),
  dosage_form: z.enum(DOSAGE_FORMS, {
    errorMap: () => ({ message: "Please select a valid dosage form" }),
  }),
  unit_price: z.coerce.number().min(0, "Unit price must be 0 or greater"),
  reorder_level: z.coerce.number().int().min(0, "Reorder level must be 0 or greater").default(20),
  default_supplier_id: z.string().uuid("Invalid supplier ID").optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});
export type MedicineInput = z.infer<typeof medicineSchema>;

export const medicineQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  status: z.string().optional(),
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => val === "true"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});
export type MedicineQuery = z.infer<typeof medicineQuerySchema>;

// Supplier Schemas
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(100),
  contact_person: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().trim().max(255).optional().nullable(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const supplierQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

// Purchases & Purchase Items Schemas
export const purchaseItemSchema = z.object({
  medicine_id: z.string().uuid("Valid medicine is required"),
  batch_number: z.string().trim().min(1, "Batch number is required").max(50),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Unit cost cannot be negative"),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format"),
  manufacture_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Manufacture date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .or(z.literal("")),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const purchaseSchema = z.object({
  supplier_id: z.string().uuid("Please select a supplier"),
  invoice_number: z.string().trim().max(50).optional().nullable(),
  purchase_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Purchase date must be in YYYY-MM-DD format")
    .default(() => new Date().toISOString().split("T")[0]),
  notes: z.string().trim().max(500).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "Purchase must include at least one item"),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const purchaseQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  supplierId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// Stock Operations Schemas
export const dispenseStockSchema = z.object({
  medicine_id: z.string().uuid("Please select a medicine"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.enum(["SALE", "DISPENSE", "DAMAGED"], {
    errorMap: () => ({ message: "Reason must be SALE, DISPENSE, or DAMAGED" }),
  }),
  notes: z.string().trim().max(500).optional().nullable(),
});
export type DispenseStockInput = z.infer<typeof dispenseStockSchema>;

export const receiveStockSchema = z.object({
  medicine_id: z.string().uuid("Please select a medicine"),
  supplier_id: z.string().uuid("Please select a supplier"),
  batch_number: z.string().trim().min(1, "Batch number is required").max(50),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  unit_cost: z.coerce.number().min(0, "Unit cost must be 0 or greater"),
  expiry_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expiry date must be in YYYY-MM-DD format"),
  manufacture_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Manufacture date must be in YYYY-MM-DD format")
    .optional()
    .nullable()
    .or(z.literal("")),
  invoice_number: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});
export type ReceiveStockInput = z.infer<typeof receiveStockSchema>;

export const adjustStockSchema = z.object({
  batch_id: z.string().uuid("Valid batch is required"),
  new_quantity: z.coerce.number().int().min(0, "New quantity must be 0 or greater"),
  notes: z.string().trim().min(3, "A valid reason (at least 3 characters) is required for audit trail").max(500),
});
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const writeOffSchema = z.object({
  batch_id: z.string().uuid("Valid batch ID is required"),
});
export type WriteOffInput = z.infer<typeof writeOffSchema>;

export const movementQuerySchema = z.object({
  medicineId: z.string().uuid().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  reason: z.enum(MOVEMENT_REASONS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

// User Management Schemas
export const createUserSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: "Role must be admin or staff" }),
  }),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  is_active: z.boolean().optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const resetUserPasswordSchema = z.object({
  new_password: z.string().min(6, "New password must be at least 6 characters"),
});
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

// Settings Schemas
export const settingsSchema = z.object({
  pharmacy_name: z.string().trim().min(1, "Pharmacy name is required").max(100),
  near_expiry_days: z.coerce
    .number()
    .int()
    .min(1, "Near expiry window must be at least 1 day")
    .max(365, "Near expiry window cannot exceed 365 days"),
  default_reorder_level: z.coerce
    .number()
    .int()
    .min(0, "Default reorder level cannot be negative")
    .max(10000),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
