import { canViewAllBranches, getAssignedBranchIds, getConfiguredBranchIds } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function getActiveSales(profile?: Profile) {
  const sales = await getSales();
  const assignedBranchIds = profile ? getAssignedBranchIds(profile) : [];
  return sales.filter((item) => {
    if (item.status !== "Aktif") return false;
    if (profile && !canViewAllBranches(profile)) {
      return !!item.branch_id && assignedBranchIds.includes(item.branch_id);
    }
    return true;
  });
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
  const pageSize = 1000;

  function buildQuery(from?: number, to?: number) {
    let query = supabase
      .from("data_customers")
      .select("id, customer_code, branch_id, customer_name, status, branches(id, code, name)")
      .order("customer_name");

    if (!canViewAllBranches(profile)) {
      const branchIds = getAssignedBranchIds(profile);
      if (!branchIds.length) return null;
      query = query.in("branch_id", branchIds);
    }

    if (canViewAllBranches(profile) && options.branchId) {
      query = query.eq("branch_id", options.branchId);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    }

    if (options.search?.trim()) {
      const search = options.search.trim().replace(/[%_]/g, "");
      query = query.or(`customer_code.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    return from === undefined || to === undefined ? query.limit(limit) : query.range(from, to);
  }

  if (limit <= pageSize) {
    const query = buildQuery();
    if (!query) return [];
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Customer[];
  }

  const rows: Customer[] = [];
  for (let from = 0; from < limit; from += pageSize) {
    const to = Math.min(from + pageSize - 1, limit - 1);
    const query = buildQuery(from, to);
    if (!query) return [];
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const chunk = (data ?? []) as unknown as Customer[];
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
  }

  return rows;
}

export async function getActiveCustomers(profile: Profile) {
  const customers = await getCustomers(profile, { status: "Aktif", limit: 1000 });
  return customers.filter((item) => item.status === "Aktif");
}

export async function getReports(
  table: string,
  profile: Profile,
  options: { limitAccountingToConfiguredBranches?: boolean } = {},
) {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) return [];
    query = query.in("branch_id", branchIds);
  }

  if (profile.role === "accounting" && options.limitAccountingToConfiguredBranches) {
    const branchIds = getConfiguredBranchIds(profile);
    if (!branchIds.length) return [];
    query = query.in("branch_id", branchIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ReportRow[];
  const missingCreatorIds = Array.from(
    new Set(rows.filter((row) => !row.profiles?.full_name).map((row) => row.created_by).filter(Boolean)),
  );

  if (!missingCreatorIds.length) return rows;

  try {
    const admin = createAdminClient();
    const { data: creators, error: creatorError } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", missingCreatorIds);
    if (creatorError) throw creatorError;

    const creatorMap = new Map(
      (creators ?? []).map((creator) => [
        creator.id,
        { full_name: creator.full_name, email: creator.email },
      ]),
    );
    return rows.map((row) => ({
      ...row,
      profiles: row.profiles?.full_name ? row.profiles : creatorMap.get(row.created_by) ?? row.profiles,
    })) as ReportRow[];
  } catch {
    return rows;
  }
}
