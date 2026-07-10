import { createPemenuhanPo } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerSelect } from "@/components/customer-select";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { SalesSelect } from "@/components/sales-select";
import { Input, InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getActiveCustomers, getActiveSales, getBranches, getReports } from "@/lib/data";

export default async function PemenuhanPoPage() {
  const profile = await requireProfile();
  const [branches, rows, sales, customers] = await Promise.all([
    getBranches(),
    getReports("pemenuhan_po_reports", profile),
    getActiveSales(),
    getActiveCustomers(profile),
  ]);

  return (
    <Guard profile={profile} href="/pemenuhan-po">
      <PageHeader
        title="Pemenuhan PO"
        description="Catat data PO, lampiran PO, dan bukti konfirmasi untuk proses pemenuhan."
      />
      <InputDataLayout>
        <Panel title="Form Pemenuhan PO" className="flex min-h-0 flex-col">
          <form action={createPemenuhanPo} className="grid gap-4">
            <BranchSelect branches={branches} profile={profile} />
            <CustomerSelect customers={customers} />
            <SalesSelect label="Nama Sales" name="sales_name" sales={sales} />
            <Input label="Tanggal PO" name="po_date" type="date" />
            <Input label="No PO" name="po_number" />
            <MultiFileInput
              label="File PO"
              name="po_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Input label="Contact Person" name="contact_person" />
            <Input label="No HP" name="phone" />
            <MultiFileInput
              label="Bukti Konfirmasi (foto WA)"
              name="confirmation_file"
              accept="image/*"
            />
            <SubmitButton />
          </form>
        </Panel>
        <Panel title="Data Pemenuhan PO" className="flex min-h-0 flex-col">
          <ReportTable
            rows={rows}
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
      </InputDataLayout>
    </Guard>
  );
}
