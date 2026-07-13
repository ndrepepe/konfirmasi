import Link from "next/link";
import { createPemenuhanPo, deletePemenuhanPo, updatePemenuhanPo } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerSelect } from "@/components/customer-select";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { SalesSelect } from "@/components/sales-select";
import { Input, InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getActiveCustomers, getActiveSales, getBranches, getReports } from "@/lib/data";

export default async function PemenuhanPoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [branches, rows, sales, customers] = await Promise.all([
    getBranches(),
    getReports("pemenuhan_po_reports", profile, { limitAccountingToConfiguredBranches: true }),
    getActiveSales(profile),
    getActiveCustomers(profile),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);
  const canInputPemenuhanPo = profile.role !== "accounting";
  const dataPanel = (
    <Panel title="Data Pemenuhan PO" className="flex min-h-0 flex-col">
      <ReportTable
        rows={rows}
        editHrefBase={canInputPemenuhanPo ? "/pemenuhan-po" : undefined}
        viewHrefBase={profile.role === "accounting" ? "/pemenuhan-po" : undefined}
        deleteAction={profile.role === "super_user" ? deletePemenuhanPo : undefined}
        columns={[
          { key: "customer_name", label: "Customer" },
          { key: "sales_name", label: "Sales" },
          { key: "po_date", label: "Tanggal PO" },
          { key: "po_number", label: "No PO" },
          { key: "contact_person", label: "CP" },
          { key: "phone", label: "No HP" },
        ]}
      />
    </Panel>
  );

  return (
    <Guard profile={profile} href="/pemenuhan-po">
      <PageHeader
        title="Pemenuhan PO"
        description="Catat data PO, lampiran PO, dan bukti konfirmasi untuk proses pemenuhan."
      />
      {canInputPemenuhanPo ? (
        <InputDataLayout>
        <Panel title={editingRow ? "Edit Pemenuhan PO" : "Form Pemenuhan PO"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updatePemenuhanPo : createPemenuhanPo} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchSelect
              branches={branches}
              profile={profile}
              defaultValue={editingRow?.branch_id}
              limitToAssigned={profile.role === "accounting"}
            />
            <CustomerSelect customers={customers} defaultValue={String(editingRow?.customer_name ?? "")} />
            <SalesSelect
              label="Nama Sales"
              name="sales_name"
              sales={sales}
              defaultValue={String(editingRow?.sales_name ?? "")}
            />
            <Input
              label="Tanggal PO"
              name="po_date"
              type="date"
              defaultValue={String(editingRow?.po_date ?? "").slice(0, 10)}
            />
            <Input label="No PO" name="po_number" defaultValue={String(editingRow?.po_number ?? "")} />
            <MultiFileInput
              label="File PO"
              name="po_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              required={!editingRow}
            />
            <Input label="Contact Person" name="contact_person" defaultValue={String(editingRow?.contact_person ?? "")} />
            <Input label="No HP" name="phone" defaultValue={String(editingRow?.phone ?? "")} />
            <MultiFileInput
              label="Bukti Konfirmasi (foto WA)"
              name="confirmation_file"
              accept="image/*"
              required={!editingRow}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingRow ? "Update" : "Simpan"}</SubmitButton>
              {editingRow ? (
                <Link
                  href="/pemenuhan-po"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
        {dataPanel}
        </InputDataLayout>
      ) : (
        <div className="grid gap-5">{dataPanel}</div>
      )}
    </Guard>
  );
}
