import { createCustomerBaru } from "@/app/actions/reports";
import { BranchSelect } from "@/components/branch-select";
import { Guard } from "@/components/app-shell";
import { ReportTable } from "@/components/report-table";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getReports } from "@/lib/data";

export default async function CustomerBaruPage() {
  const profile = await requireProfile();
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("customer_baru_reports", profile),
  ]);

  return (
    <Guard profile={profile} href="/customer-baru">
      <PageHeader
        title="Customer Baru"
        description="Input customer baru berikut bukti konfirmasi WhatsApp dan informasi Bsoft."
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Form Customer Baru">
          <form action={createCustomerBaru} className="grid gap-4">
            <BranchSelect branches={branches} profile={profile} />
            <Input label="Customer Baru" name="customer_new" />
            <Input label="Tanggal Input Bsoft" name="bsoft_input_date" type="date" />
            <Input label="ID Customer" name="customer_id" />
            <Input label="Contact Person" name="contact_person" />
            <Input label="No HP" name="phone" />
            <FileInput label="Bukti Konfirmasi (foto WA)" name="confirmation_file" accept="image/*" />
            <SubmitButton />
          </form>
        </Panel>
        <Panel title="Data Customer Baru">
          <ReportTable
            rows={rows}
            columns={[
              { key: "customer_new", label: "Customer" },
              { key: "bsoft_input_date", label: "Tanggal Bsoft" },
              { key: "customer_id", label: "ID Customer" },
              { key: "contact_person", label: "CP" },
              { key: "phone", label: "No HP" },
            ]}
          />
        </Panel>
      </div>
    </Guard>
  );
}
