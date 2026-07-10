import { z } from "zod";

export const branchSchema = z.object({
  code: z.string().min(2, "Kode cabang wajib diisi").max(30),
  name: z.string().min(2, "Nama cabang wajib diisi").max(120),
});

export const userSchema = z.object({
  full_name: z.string().min(2, "Nama user wajib diisi").max(120),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["super_user", "accounting", "admin_cabang"]),
  branch_id: z.string().uuid().optional().or(z.literal("")),
});

export const customerBaruSchema = z.object({
  branch_id: z.string().uuid(),
  customer_new: z.string().min(2),
  sales_requester: z.string().min(2),
  bsoft_input_date: z.string().min(1),
  customer_id: z.string().min(1),
  contact_person: z.string().min(2),
  phone: z.string().min(5),
});

export const pemenuhanPoSchema = z.object({
  branch_id: z.string().uuid(),
  customer_name: z.string().min(2),
  sales_name: z.string().min(2),
  po_date: z.string().min(1),
  po_number: z.string().min(1),
  contact_person: z.string().min(2),
  phone: z.string().min(5),
});

export const penagihanSchema = z.object({
  branch_id: z.string().uuid(),
  customer_name: z.string().min(2),
});
