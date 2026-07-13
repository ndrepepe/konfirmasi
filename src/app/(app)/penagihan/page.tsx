import Link from "next/link";
import { createPenagihan, deletePenagihan, updatePenagihan } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerSelect } from "@/components/customer-select";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getActiveCustomers, getBranches, getReports } from "@/lib/data";

export default async function PenagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [branches, rows, customers] = await Promise.all([
    getBranches(),
    getReports("penagihan_reports", profile),
    getActiveCustomers(profile),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);

  return (
    <Guard profile={profile} href="/penagihan">
      <PageHeader
        title="Penagihan"
        description="Catat bukti penagihan untuk customer pada cabang terkait."
      />
      <InputDataLayout>
        <Panel title={editingRow ? "Edit Penagihan" : "Form Penagihan"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updatePenagihan : createPenagihan} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchSelect
              branches={branches}
              profile={profile}
              defaultValue={editingRow?.branch_id}
              limitToAssigned={profile.role === "accounting"}
            />
            <CustomerSelect customers={customers} defaultValue={String(editingRow?.customer_name ?? "")} />
            <MultiFileInput
              label="Bukti"
              name="proof_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              required={!editingRow}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingRow ? "Update" : "Simpan"}</SubmitButton>
              {editingRow ? (
                <Link
                  href="/penagihan"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
        <Panel title="Data Penagihan" className="flex min-h-0 flex-col">
          <ReportTable
            rows={rows}
            editHrefBase="/penagihan"
            deleteAction={profile.role === "super_user" ? deletePenagihan : undefined}
            columns={[{ key: "customer_name", label: "Customer" }]}
          />
        </Panel>
      </InputDataLayout>
    </Guard>
  );
}
