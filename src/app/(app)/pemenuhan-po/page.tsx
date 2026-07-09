import { createPemenuhanPo } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { ReportTable } from "@/components/report-table";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getReports } from "@/lib/data";

export default async function PemenuhanPoPage() {
  const profile = await requireProfile();
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("pemenuhan_po_reports", profile),
  ]);

  return (
    <Guard profile={profile} href="/pemenuhan-po">
      <PageHeader
        title="Pemenuhan PO"
        description="Catat data PO, lampiran PO, dan bukti konfirmasi untuk proses pemenuhan."
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Form Pemenuhan PO">
          <form action={createPemenuhanPo} className="grid gap-4">
            <BranchSelect branches={branches} profile={profile} />
            <Input label="Nama Customer" name="customer_name" />
            <Input label="Tanggal PO" name="po_date" type="date" />
            <Input label="No PO" name="po_number" />
            <FileInput
              label="File PO"
              name="po_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Input label="Contact Person" name="contact_person" />
            <Input label="No HP" name="phone" />
            <FileInput label="Bukti Konfirmasi (foto WA)" name="confirmation_file" accept="image/*" />
            <SubmitButton />
          </form>
        </Panel>
        <Panel title="Data Pemenuhan PO">
          <ReportTable
            rows={rows}
            columns={[
              { key: "customer_name", label: "Customer" },
              { key: "po_date", label: "Tanggal PO" },
              { key: "po_number", label: "No PO" },
              { key: "contact_person", label: "CP" },
              { key: "phone", label: "No HP" },
            ]}
          />
        </Panel>
      </div>
    </Guard>
  );
}
