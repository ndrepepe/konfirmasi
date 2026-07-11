import Link from "next/link";
import { createCustomerBaru, deleteCustomerBaru, updateCustomerBaru } from "@/app/actions/reports";
import { BranchSelect } from "@/components/branch-select";
import { Guard } from "@/components/app-shell";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { SalesSelect } from "@/components/sales-select";
import { Input, InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getActiveSales, getBranches, getReports } from "@/lib/data";

export default async function CustomerBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [branches, rows, sales] = await Promise.all([
    getBranches(),
    getReports("customer_baru_reports", profile),
    getActiveSales(),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);

  return (
    <Guard profile={profile} href="/customer-baru">
      <PageHeader
        title="Customer Baru"
        description="Input customer baru berikut bukti konfirmasi WhatsApp dan informasi Bsoft."
      />
      <InputDataLayout>
        <Panel title={editingRow ? "Edit Customer Baru" : "Form Customer Baru"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updateCustomerBaru : createCustomerBaru} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchSelect branches={branches} profile={profile} defaultValue={editingRow?.branch_id} />
            <Input label="Customer Baru" name="customer_new" defaultValue={String(editingRow?.customer_new ?? "")} />
            <SalesSelect
              label="Sales yg mengajukan"
              name="sales_requester"
              sales={sales}
              defaultValue={String(editingRow?.sales_requester ?? "")}
            />
            <Input
              label="Tanggal Input Bsoft"
              name="bsoft_input_date"
              type="date"
              defaultValue={String(editingRow?.bsoft_input_date ?? "").slice(0, 10)}
            />
            <Input label="ID Customer" name="customer_id" defaultValue={String(editingRow?.customer_id ?? "")} />
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
                  href="/customer-baru"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
        <Panel title="Data Customer Baru" className="flex min-h-0 flex-col">
          <ReportTable
            rows={rows}
            editHrefBase="/customer-baru"
            deleteAction={profile.role === "super_user" ? deleteCustomerBaru : undefined}
            columns={[
              { key: "customer_new", label: "Customer" },
              { key: "sales_requester", label: "Sales" },
              { key: "bsoft_input_date", label: "Tanggal Bsoft" },
              { key: "customer_id", label: "ID Customer" },
              { key: "contact_person", label: "CP" },
              { key: "phone", label: "No HP" },
            ]}
          />
        </Panel>
      </InputDataLayout>
    </Guard>
  );
}
