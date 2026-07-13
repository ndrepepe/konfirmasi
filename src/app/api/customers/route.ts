import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getCustomers } from "@/lib/data";
import { canAccessBranch, canUseConfiguredBranch } from "@/lib/permissions";

export async function GET(request: Request) {
  const profile = await requireProfile();
  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id") ?? "";

  if (!branchId) {
    return NextResponse.json({ customers: [] });
  }

  if (!canAccessBranch(profile, branchId) || !canUseConfiguredBranch(profile, branchId)) {
    return NextResponse.json({ customers: [] }, { status: 403 });
  }

  const customers = await getCustomers(profile, { branchId, limit: 50000 });
  return NextResponse.json({ customers });
}
