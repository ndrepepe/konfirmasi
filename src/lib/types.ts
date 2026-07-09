export type UserRole = "super_user" | "accounting" | "admin_cabang";

export type Branch = {
  id: string;
  code: string;
  name: string;
};

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  branch_id: string | null;
  branches?: Branch | null;
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
