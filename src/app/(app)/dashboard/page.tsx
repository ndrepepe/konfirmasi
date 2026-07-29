import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/loading-panels";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { canViewAllBranches, getConfiguredBranchIds, roleLabels } from "@/lib/permissions";
import { getBranches } from "@/lib/data";
import { createClient } from "@/lib/database/server";
import type { Profile } from "@/lib/types";

async function countRows(table: string, profile: Profile) {
  const supabase = await createClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (!canViewAllBranches(profile)) {
    const branchIds = getConfiguredBranchIds(profile);
    if (!branchIds.length) return 0;
    query = query.in("branch_id", branchIds).eq("created_by", profile.id);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

async function DashboardContent() {
  const profile = await requireProfile();
  const all = canViewAllBranches(profile);
  const branchIds = all ? [] : getConfiguredBranchIds(profile);
  const [branches, customers, pos, billings] = await Promise.all([
    getBranches(),
    profile.role === "admin_cabang" ? 0 : countRows("customer_baru_reports", profile),
    countRows("pemenuhan_po_reports", profile),
    profile.role === "admin_cabang" ? 0 : countRows("penagihan_reports", profile),
  ]);
  const branchLabel = all
    ? "Semua cabang"
    : branches
        .filter((branch) => branchIds.includes(branch.id))
        .map((branch) => branch.name)
        .join(", ") || "-";

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Panel title="Customer Baru">
          <p className="text-3xl font-semibold text-slate-950">{customers}</p>
          <p className="mt-1 text-sm text-slate-500">Total data tercatat</p>
        </Panel>
        <Panel title="Pemenuhan PO">
          <p className="text-3xl font-semibold text-slate-950">{pos}</p>
          <p className="mt-1 text-sm text-slate-500">Total data tercatat</p>
        </Panel>
        <Panel title="Penagihan">
          <p className="text-3xl font-semibold text-slate-950">{billings}</p>
          <p className="mt-1 text-sm text-slate-500">Total data tercatat</p>
        </Panel>
      </div>
      <Panel title="Profil Akses" className="mt-4">
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">Nama</dt>
            <dd className="mt-1 font-semibold text-slate-950">{profile.full_name}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="mt-1 font-semibold text-slate-950">{roleLabels[profile.role]}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Cabang</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {branchLabel}
            </dd>
          </div>
        </dl>
      </Panel>
    </>
  );
}

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan laporan prosedur konfirmasi berdasarkan hak akses user."
      />
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}
