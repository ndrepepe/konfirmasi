import { Guard } from "@/components/app-shell";
import { SearchableTable } from "@/components/searchable-table";
import { PageHeader, Panel, SubmitButton } from "@/components/ui";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import {
  formatDateOnly,
  formatDateTimeWib,
  normalizeDateInput,
} from "@/lib/date-time";
import {
  getDailyInputRecap,
  type InputRecapKind,
} from "@/lib/input-recap";
import { canViewInputRecap, roleLabels } from "@/lib/permissions";

const inputKindLabels: Record<InputRecapKind, string> = {
  customer_baru: "Customer Baru",
  pemenuhan_po: "Pemenuhan PO",
  penagihan: "Penagihan",
};

const inputKindHrefs: Record<InputRecapKind, string> = {
  customer_baru: "/customer-baru",
  pemenuhan_po: "/pemenuhan-po",
  penagihan: "/penagihan",
};

export default async function InputRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await requireProfile();
  if (!canViewInputRecap(profile)) redirect("/dashboard");

  const params = await searchParams;
  const selectedDate = normalizeDateInput(params.date);
  const rows = await getDailyInputRecap(selectedDate);

  const userSummaryMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      role: "accounting" | "admin_cabang";
      customerBaru: number;
      pemenuhanPo: number;
      penagihan: number;
      total: number;
    }
  >();

  rows.forEach((row) => {
    const summary = userSummaryMap.get(row.creator_id) ?? {
      id: row.creator_id,
      name: row.creator_name,
      email: row.creator_email,
      role: row.creator_role,
      customerBaru: 0,
      pemenuhanPo: 0,
      penagihan: 0,
      total: 0,
    };

    if (row.kind === "customer_baru") summary.customerBaru += 1;
    if (row.kind === "pemenuhan_po") summary.pemenuhanPo += 1;
    if (row.kind === "penagihan") summary.penagihan += 1;
    summary.total += 1;
    userSummaryMap.set(row.creator_id, summary);
  });

  const userSummaries = Array.from(userSummaryMap.values()).sort(
    (left, right) => right.total - left.total || left.name.localeCompare(right.name),
  );
  const accountingTotal = rows.filter((row) => row.creator_role === "accounting").length;
  const branchAdminTotal = rows.filter((row) => row.creator_role === "admin_cabang").length;

  return (
    <Guard profile={profile} href="/rekap-input">
      <PageHeader
        title="Rekap Input Harian"
        description="Pantau input harian user Accounting dan Admin Cabang berdasarkan tanggal WIB."
      />

      <Panel title="Pilih Tanggal">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-medium text-slate-700 sm:max-w-xs">
            Tanggal
            <input
              name="date"
              type="date"
              required
              defaultValue={selectedDate}
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
            />
          </label>
          <SubmitButton pendingText="Memuat...">Tampilkan</SubmitButton>
        </form>
      </Panel>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title="Tanggal Rekap">
          <p className="text-xl font-semibold text-slate-950">{formatDateOnly(selectedDate)}</p>
          <p className="mt-1 text-sm text-slate-500">Waktu Indonesia Barat</p>
        </Panel>
        <Panel title="Total Input">
          <p className="text-3xl font-semibold text-slate-950">{rows.length}</p>
          <p className="mt-1 text-sm text-slate-500">{userSummaries.length} user aktif</p>
        </Panel>
        <Panel title="Accounting">
          <p className="text-3xl font-semibold text-slate-950">{accountingTotal}</p>
          <p className="mt-1 text-sm text-slate-500">Input pada tanggal dipilih</p>
        </Panel>
        <Panel title="Admin Cabang">
          <p className="text-3xl font-semibold text-slate-950">{branchAdminTotal}</p>
          <p className="mt-1 text-sm text-slate-500">Input pada tanggal dipilih</p>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5">
        <Panel title="Rekap per User">
          <SearchableTable
            rows={userSummaries.map((summary) => ({
              id: summary.id,
              cells: {
                name: summary.name,
                email: summary.email,
                role: roleLabels[summary.role],
                customer_baru: String(summary.customerBaru),
                pemenuhan_po: String(summary.pemenuhanPo),
                penagihan: String(summary.penagihan),
                total: String(summary.total),
              },
            }))}
            columns={[
              { key: "name", label: "Nama", strong: true },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", filterable: true },
              { key: "customer_baru", label: "Customer Baru" },
              { key: "pemenuhan_po", label: "Pemenuhan PO" },
              { key: "penagihan", label: "Penagihan" },
              { key: "total", label: "Total", strong: true },
            ]}
            emptyLabel="Tidak ada input dari Accounting atau Admin Cabang pada tanggal ini."
          />
        </Panel>

        <Panel title="Detail Input">
          <SearchableTable
            rows={rows.map((row) => ({
              id: `${row.kind}-${row.id}`,
              viewHref: `${inputKindHrefs[row.kind]}/${row.id}`,
              cells: {
                time: `${formatDateTimeWib(row.created_at)} WIB`,
                user: row.creator_name,
                role: roleLabels[row.creator_role],
                type: inputKindLabels[row.kind],
                branch: row.branch_name ?? row.branch_code ?? "-",
                subject: row.subject,
              },
            }))}
            columns={[
              { key: "time", label: "Waktu Input" },
              { key: "user", label: "User", strong: true, filterable: true },
              { key: "role", label: "Role", filterable: true },
              { key: "type", label: "Jenis Input", filterable: true },
              { key: "branch", label: "Cabang", filterable: true },
              { key: "subject", label: "Data" },
            ]}
            emptyLabel="Tidak ada detail input pada tanggal ini."
          />
        </Panel>
      </div>
    </Guard>
  );
}
