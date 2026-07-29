import { Suspense } from "react";
import { DashboardSkeleton } from "@/components/loading-panels";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { canViewAllBranches, getConfiguredBranchIds, roleLabels } from "@/lib/permissions";
import { getBranches } from "@/lib/data";
import { createClient } from "@/lib/database/server";
import {
  formatBytes,
  getStorageOverview,
  type DiskUsage,
  type StorageOverview,
} from "@/lib/storage-stats";
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

function DiskUsageSummary({
  label,
  disk,
  barClassName,
}: {
  label: string;
  disk: DiskUsage | null;
  barClassName: string;
}) {
  return (
    <div className="min-w-0 py-1 md:border-l md:border-slate-200 md:pl-5">
      <dt className="text-sm font-medium text-slate-600">{label}</dt>
      {disk ? (
        <dd className="mt-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-2xl font-semibold text-slate-950">
              {formatBytes(disk.availableBytes)}
            </span>
            <span className="shrink-0 text-sm font-medium text-slate-500">
              {disk.usedPercentage.toLocaleString("id-ID", {
                maximumFractionDigits: 1,
              })}
              % terpakai
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Sisa dari total {formatBytes(disk.totalBytes)}
          </p>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label={`Pemakaian ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(disk.usedPercentage)}
          >
            <div
              className={`h-full rounded-full ${barClassName}`}
              style={{ width: `${disk.usedPercentage}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Terpakai {formatBytes(disk.usedBytes)}
          </p>
        </dd>
      ) : (
        <dd className="mt-2 text-sm font-medium text-slate-500">Tidak tersedia</dd>
      )}
    </div>
  );
}

function StorageOverviewPanel({ overview }: { overview: StorageOverview }) {
  return (
    <Panel title="Penyimpanan Server" className="mt-4">
      <dl className="grid gap-5 md:grid-cols-3 md:gap-0">
        <div className="min-w-0 py-1 md:pr-5">
          <dt className="text-sm font-medium text-slate-600">File Lampiran</dt>
          {overview.attachments ? (
            <dd className="mt-2">
              <p className="text-2xl font-semibold text-slate-950">
                {overview.attachments.fileCount.toLocaleString("id-ID")} file
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Total ukuran {formatBytes(overview.attachments.totalBytes)}
              </p>
            </dd>
          ) : (
            <dd className="mt-2 text-sm font-medium text-slate-500">Tidak tersedia</dd>
          )}
        </div>
        <DiskUsageSummary label="HDD Lampiran" disk={overview.hdd} barClassName="bg-teal-600" />
        <DiskUsageSummary label="SSD Database" disk={overview.ssd} barClassName="bg-amber-500" />
      </dl>
    </Panel>
  );
}

async function DashboardContent() {
  const profile = await requireProfile();
  const all = canViewAllBranches(profile);
  const branchIds = all ? [] : getConfiguredBranchIds(profile);
  const [branches, customers, pos, billings, storageOverview] = await Promise.all([
    getBranches(),
    profile.role === "admin_cabang" ? 0 : countRows("customer_baru_reports", profile),
    countRows("pemenuhan_po_reports", profile),
    profile.role === "admin_cabang" ? 0 : countRows("penagihan_reports", profile),
    profile.role === "super_user" ? getStorageOverview() : Promise.resolve(null),
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
      {storageOverview ? <StorageOverviewPanel overview={storageOverview} /> : null}
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
