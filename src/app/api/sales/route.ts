import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { canAccessBranch, canUseConfiguredBranch } from "@/lib/permissions";
import { createAdminClient } from "@/lib/database/admin";

export async function GET(request: Request) {
  const profile = await requireProfile();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id") ?? "";
  const search = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const requestedLimit = Number(searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 200)
    : 100;

  if (!branchId) {
    return NextResponse.json({ sales: [] });
  }

  if (!canAccessBranch(profile, branchId) || !canUseConfiguredBranch(profile, branchId)) {
    return NextResponse.json({ sales: [] }, { status: 403 });
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("data_sales")
    .select("id, sales_code, branch_id, sales_name, status, branches(id, code, name)")
    .eq("branch_id", branchId)
    .order("sales_name")
    .limit(limit);

  if (status) query = query.eq("status", status);
  if (search.trim()) {
    const keyword = search.trim().replace(/[%_]/g, "");
    query = query.or(`sales_code.ilike.%${keyword}%,sales_name.ilike.%${keyword}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return NextResponse.json({ sales: data ?? [] });
}
