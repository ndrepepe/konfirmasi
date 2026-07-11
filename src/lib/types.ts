export type UserRole = "super_user" | "accounting" | "admin_cabang";

export type Branch = {
  id: string;
  code: string;
  name: string;
};

export type MasterStatus = "Aktif" | "Nonaktif";

export type Sales = {
  id: string;
  sales_code: string;
  branch_id: string | null;
  sales_name: string;
  status: MasterStatus;
  branches?: Branch | null;
};

export type Customer = {
  id: string;
  customer_code: string;
  branch_id: string;
  customer_name: string;
  status: MasterStatus;
  branches?: Branch | null;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  branch_id: string | null;
  branches?: Branch | null;
  branch_ids?: string[];
  assigned_branches?: Branch[];
};

export type ReportKind = "customer_baru" | "pemenuhan_po" | "penagihan";

export type ReportRow = {
  id: string;
  branch_id: string;
  created_by: string;
  created_at: string;
  branches?: Branch | null;
  profiles?: Pick<Profile, "full_name" | "email"> | null;
  [key: string]: unknown;
};
