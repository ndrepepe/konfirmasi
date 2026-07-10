import { createPenagihan } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerSelect } from "@/components/customer-select";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { PageHeader, Panel, SubmitButton } from "@/components/ui";
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
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Form Penagihan">
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
        <Panel title="Data Penagihan">
          <ReportTable rows={rows} columns={[{ key: "customer_name", label: "Customer" }]} />
        </Panel>
      </div>
    </Guard>
  );
}
