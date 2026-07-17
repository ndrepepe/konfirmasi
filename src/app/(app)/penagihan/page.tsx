import Link from "next/link";
import { Suspense } from "react";
import { createPenagihan, deletePenagihan, updatePenagihan } from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchScopedCustomerSelect } from "@/components/branch-scoped-fields";
import { InputDataSkeleton } from "@/components/loading-panels";
import { MultiFileInput } from "@/components/multi-file-input";
import { ReportTable } from "@/components/report-table";
import { InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getReports } from "@/lib/data";
import { getConfiguredBranchIds } from "@/lib/permissions";

export default async function PenagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;

  return (
    <Guard profile={profile} href="/penagihan">
      <PageHeader
        title="Penagihan"
        description="Catat bukti penagihan untuk customer pada cabang terkait."
      />
      <Suspense
        key={params.edit ?? "new"}
        fallback={<InputDataSkeleton formTitle="Form Penagihan" dataTitle="Data Penagihan" />}
      >
        <PenagihanContent profile={profile} params={params} />
      </Suspense>
    </Guard>
  );
}

async function PenagihanContent({
  profile,
  params,
}: {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  params: { edit?: string };
}) {
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("penagihan_reports", profile),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);
  const configuredBranchIds = getConfiguredBranchIds(profile);
  const inputBranches =
    profile.role === "accounting"
      ? branches.filter((branch) => configuredBranchIds.includes(branch.id))
      : branches;

  return (
    <InputDataLayout>
        <Panel title={editingRow ? "Edit Penagihan" : "Form Penagihan"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updatePenagihan : createPenagihan} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchScopedCustomerSelect
              branches={inputBranches}
              defaultBranchId={editingRow?.branch_id}
              defaultCustomerName={String(editingRow?.customer_name ?? "")}
              loadCustomersByBranch
            />
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
  );
}
