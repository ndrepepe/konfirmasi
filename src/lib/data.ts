import { unstable_cache } from "next/cache";
import { canViewAllBranches, getAssignedBranchIds, getConfiguredBranchIds } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Customer, Profile, ReportRow, Sales } from "@/lib/types";

const getCachedBranches = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("branches")
      .select("id, code, name")
      .order("code");
    if (error) throw new Error(error.message);
    return (data ?? []) as Branch[];
  },
  ["branches"],
  { revalidate: 3600, tags: ["branches"] },
);

const getCachedSales = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("data_sales")
      .select("id, sales_code, branch_id, sales_name, status, branches(id, code, name)")
      .order("sales_name");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Sales[];
  },
  ["data-sales"],
  { revalidate: 300, tags: ["data-sales"] },
);

export async function getBranches() {
  return getCachedBranches();
}

export async function getSales() {
  return getCachedSales();
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
    limitAccountingToConfiguredBranches?: boolean;
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

    if (
      profile.role === "accounting" &&
      options.limitAccountingToConfiguredBranches &&
      !options.branchId
    ) {
      const branchIds = getConfiguredBranchIds(profile);
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
  const supabase = createAdminClient();
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
  return (data ?? []) as ReportRow[];
}
