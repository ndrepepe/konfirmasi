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
  type DiskHealth,
  type DiskHealthStatus,
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

const healthLabels: Record<DiskHealthStatus, string> = {
  healthy: "Sehat",
  warning: "Perlu perhatian",
  critical: "Bermasalah",
  unavailable: "Tidak tersedia",
};

const healthClasses: Record<DiskHealthStatus, string> = {
  healthy: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
  unavailable: "bg-slate-100 text-slate-600 ring-slate-200",
};

function formatHours(hours: number | null) {
  if (hours === null) return "-";
  const days = Math.floor(hours / 24);
  return days > 0
    ? `${days.toLocaleString("id-ID")} hari`
    : `${hours.toLocaleString("id-ID")} jam`;
}

function DiskHealthSummary({
  label,
  disk,
  isSsd = false,
}: {
  label: string;
  disk: DiskHealth;
  isSsd?: boolean;
}) {
  return (
    <div className="min-w-0 py-1 md:border-l md:border-slate-200 md:pl-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-950">{label}</h4>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${healthClasses[disk.status]}`}
        >
          {healthLabels[disk.status]}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-slate-500" title={disk.model}>
        {disk.model || "-"}
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-slate-500">Suhu</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {disk.temperatureC === null ? "-" : `${disk.temperatureC} C`}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Waktu menyala</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {formatHours(disk.powerOnHours)}
          </dd>
        </div>
        {isSsd ? (
          <div className="col-span-2">
            <dt className="text-slate-500">Sisa umur SSD</dt>
            <dd className="mt-1 font-semibold text-slate-950">
              {disk.lifeRemainingPercentage === null
                ? "-"
                : `${disk.lifeRemainingPercentage}%`}
            </dd>
          </div>
        ) : (
          <>
            <div>
              <dt className="text-slate-500">Sektor dialihkan</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {disk.reallocatedSectors?.toLocaleString("id-ID") ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Sektor tertunda</dt>
              <dd className="mt-1 font-semibold text-slate-950">
                {disk.pendingSectors?.toLocaleString("id-ID") ?? "-"}
              </dd>
            </div>
          </>
        )}
      </dl>
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
      <div className="mt-5 border-t border-slate-200 pt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-950">Kesehatan Perangkat</h4>
          {overview.diskHealth ? (
            <p className="text-xs text-slate-500">
              Diperiksa{" "}
              {new Intl.DateTimeFormat("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Jakarta",
              }).format(new Date(overview.diskHealth.updatedAt))}{" "}
              WIB
            </p>
          ) : null}
        </div>
        {overview.diskHealth ? (
          <div className="grid gap-5 md:grid-cols-2 md:gap-0">
            <DiskHealthSummary label="HDD Lampiran" disk={overview.diskHealth.hdd} />
            <DiskHealthSummary label="SSD Database" disk={overview.diskHealth.ssd} isSsd />
          </div>
        ) : (
          <p className="text-sm font-medium text-slate-500">
            Data SMART belum tersedia.
          </p>
        )}
      </div>
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
