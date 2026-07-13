import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getConfiguredBranchIds, roleLabels } from "@/lib/permissions";
import { getBranches } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

async function countRows(table: string, branchIds: string[], all: boolean) {
  const supabase = await createClient();
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (!all) {
    if (!branchIds.length) return 0;
    query = query.in("branch_id", branchIds);
  }
  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}

export default async function DashboardPage() {
  const profile = await requireProfile();
  const all = profile.role === "super_user";
  const branchIds = all ? [] : getConfiguredBranchIds(profile);
  const [branches, customers, pos, billings] = await Promise.all([
    getBranches(),
    profile.role === "admin_cabang" ? 0 : countRows("customer_baru_reports", branchIds, all),
    countRows("pemenuhan_po_reports", branchIds, all),
    profile.role === "admin_cabang" ? 0 : countRows("penagihan_reports", branchIds, all),
  ]);
  const branchLabel = all
    ? "Semua cabang"
    : branches
        .filter((branch) => branchIds.includes(branch.id))
        .map((branch) => branch.name)
        .join(", ") || "-";

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan laporan prosedur konfirmasi berdasarkan hak akses user."
      />
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
