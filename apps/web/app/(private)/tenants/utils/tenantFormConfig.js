import { z } from "zod";

export const BILLING_CYCLE_OPTIONS = [
  { value: "2", label: "Bi-monthly" },
  { value: "3", label: "Quarterly" },
  { value: "6", label: "Bi-annual" },
  { value: "12", label: "Annual" },
];

export const VACANT_UNIT_STATUSES = ["vacant", "available", "Vacant", "Available"];

export const tenantSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  national_id: z.string().min(1, "National ID is required"),
  emergency_contact: z.string().min(1, "Phone number is required"),
  occupation: z.string().optional(),
  notes: z.string().optional(),
  lease_start: z.string().min(1, "Lease start date is required"),
  property_id: z.string().min(1, "Choose a property"),
  block_id: z.string().optional().or(z.literal("")),
  unit_id: z.string().min(1, "Choose a unit"),
  rent_amount: z.union([z.coerce.number(), z.literal("")]).optional(),
  deposit_amount: z.union([z.coerce.number(), z.literal("")]).optional(),
  opening_balance: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
  billing_cycle_enabled: z.boolean().default(false),
  billing_cycle_months: z.string().optional(),
  prorate_first_month: z.boolean().default(true),
  move_in_rent: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).optional(),
});

/** Move-ins on or after this day pay nothing for the rest of that month. */
export const PRORATE_CUTOFF_DAY = 25;

export const emptyTenantForm = {
  full_name: "",
  email: "",
  national_id: "",
  emergency_contact: "",
  occupation: "",
  notes: "",
  lease_start: "",
  property_id: "",
  block_id: "",
  unit_id: "",
  rent_amount: "",
  deposit_amount: "",
  opening_balance: "",
  billing_cycle_enabled: false,
  billing_cycle_months: "1",
  prorate_first_month: true,
  move_in_rent: "",
};
