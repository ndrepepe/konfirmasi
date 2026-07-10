import { canViewAllBranches } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Customer, Profile, ReportRow, Sales } from "@/lib/types";

export async function getBranches() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, code, name")
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as Branch[];
}

export async function getSales() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("data_sales")
    .select("id, sales_code, branch_id, sales_name, status, branches(id, code, name)")
    .order("sales_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Sales[];
}

export async function getActiveSales() {
  const sales = await getSales();
  return sales.filter((item) => item.status === "Aktif");
}

export async function getCustomers(
  profile: Profile,
  options: {
    search?: string;
    status?: string;
    branchId?: string;
    limit?: number;
  } = {},
) {
  const supabase = await createClient();
  const limit = options.limit ?? 500;
  let query = supabase
    .from("data_customers")
    .select("id, customer_code, branch_id, customer_name, status, branches(id, code, name)")
    .order("customer_name")
    .limit(limit);

  if (!canViewAllBranches(profile) && profile.branch_id) {
    query = query.eq("branch_id", profile.branch_id);
  }

  if (canViewAllBranches(profile) && options.branchId) {
    query = query.eq("branch_id", options.branchId);
  }

  if (options.status) {
    query = query.eq("status", options.status);
  }

  if (options.search?.trim()) {
    const search = options.search.trim().replace(/[%_]/g, "");
    query = query.or(
      `customer_code.ilike.%${search}%,customer_name.ilike.%${search}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Customer[];
}

export async function getActiveCustomers(profile: Profile) {
  const customers = await getCustomers(profile, { status: "Aktif", limit: 1000 });
  return customers.filter((item) => item.status === "Aktif");
}

export async function getReports(table: string, profile: Profile) {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!canViewAllBranches(profile) && profile.branch_id) {
    query = query.eq("branch_id", profile.branch_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRow[];
}
