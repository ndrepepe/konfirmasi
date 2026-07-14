import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getCustomers } from "@/lib/data";
import { canAccessBranch, canUseConfiguredBranch } from "@/lib/permissions";

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
    return NextResponse.json({ customers: [] });
  }

  if (!canAccessBranch(profile, branchId) || !canUseConfiguredBranch(profile, branchId)) {
    return NextResponse.json({ customers: [] }, { status: 403 });
  }

  const customers = await getCustomers(profile, {
    branchId,
    search,
    status: status || undefined,
    limit,
  });
  return NextResponse.json({ customers });
}
