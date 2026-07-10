import { createPenagihan } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerSelect } from "@/components/customer-select";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getActiveCustomers, getBranches, getReports } from "@/lib/data";

export default async function PenagihanPage() {
  const profile = await requireProfile();
  const [branches, rows, customers] = await Promise.all([
    getBranches(),
    getReports("penagihan_reports", profile),
    getActiveCustomers(profile),
  ]);

  return (
    <Guard profile={profile} href="/penagihan">
      <PageHeader
        title="Penagihan"
        description="Catat bukti penagihan untuk customer pada cabang terkait."
      />
      <InputDataLayout>
        <Panel title="Form Penagihan" className="flex min-h-0 flex-col">
          <form action={createPenagihan} className="grid gap-4">
            <BranchSelect branches={branches} profile={profile} />
            <CustomerSelect customers={customers} />
            <MultiFileInput
              label="Bukti"
              name="proof_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <SubmitButton />
          </form>
        </Panel>
        <Panel title="Data Penagihan" className="flex min-h-0 flex-col">
          <ReportTable rows={rows} columns={[{ key: "customer_name", label: "Customer" }]} />
        </Panel>
      </InputDataLayout>
    </Guard>
  );
}
