import { createPenagihan } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { ReportTable } from "@/components/report-table";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getReports } from "@/lib/data";

export default async function PenagihanPage() {
  const profile = await requireProfile();
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("penagihan_reports", profile),
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
            <Input label="Customer" name="customer_name" />
            <FileInput
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
