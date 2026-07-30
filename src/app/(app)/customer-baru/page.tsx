import Link from "next/link";
import { Suspense } from "react";
import {
  createCustomerBaru,
  deleteCustomerBaru,
  deleteCustomerBaruAttachment,
  updateCustomerBaru,
} from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchScopedSalesSelect } from "@/components/branch-scoped-fields";
import { DataPanelSkeleton, FormPanelSkeleton } from "@/components/loading-panels";
import { MultiFileInput } from "@/components/multi-file-input";
import { PageSubnav, type PageView } from "@/components/page-subnav";
import { ReportTable } from "@/components/report-table";
import { Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getReports } from "@/lib/data";
import { formatDateOnly, toDateInputValue } from "@/lib/date-time";
import { getConfiguredBranchIds } from "@/lib/permissions";
import { getAttachmentLinks } from "@/lib/storage";

export default async function CustomerBaruPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; view?: PageView }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <Guard profile={profile} href="/customer-baru">
      <PageHeader
        title="Customer Baru"
        description="Input customer baru berikut bukti konfirmasi WhatsApp dan informasi Bsoft."
      />
      <PageSubnav
        baseHref="/customer-baru"
        activeView={activeView}
      />
      <Suspense
        key={`${params.view ?? "input"}-${params.edit ?? "new"}`}
        fallback={
          activeView === "input" ? (
            <FormPanelSkeleton title="Form Customer Baru" />
          ) : (
            <DataPanelSkeleton title="Data Customer Baru" />
          )
        }
      >
        <CustomerBaruContent profile={profile} params={params} />
      </Suspense>
    </Guard>
  );
}

async function CustomerBaruContent({
  profile,
  params,
}: {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  params: { edit?: string; view?: PageView };
}) {
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("customer_baru_reports", profile),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);
  const configuredBranchIds = getConfiguredBranchIds(profile);
  const inputBranches =
    profile.role === "accounting"
      ? branches.filter((branch) => configuredBranchIds.includes(branch.id))
      : branches;
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";
  const existingConfirmationFiles = editingRow
    ? await getAttachmentLinks(editingRow.confirmation_file)
    : [];

  return (
    <div className="grid gap-5">
      {activeView === "input" ? (
        <Panel title={editingRow ? "Edit Customer Baru" : "Form Customer Baru"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updateCustomerBaru : createCustomerBaru} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchScopedSalesSelect
              branches={inputBranches}
              defaultBranchId={editingRow?.branch_id}
              defaultSalesName={String(editingRow?.sales_requester ?? "")}
              loadSalesByBranch
              salesStatus="Aktif"
            >
              <Input label="Customer Baru" name="customer_new" defaultValue={String(editingRow?.customer_new ?? "")} />
            </BranchScopedSalesSelect>
            <Input
              label="Tanggal Input Bsoft"
              name="bsoft_input_date"
              type="date"
              defaultValue={toDateInputValue(editingRow?.bsoft_input_date)}
            />
            <Input label="ID Customer" name="customer_id" defaultValue={String(editingRow?.customer_id ?? "")} />
            <Input label="Contact Person" name="contact_person" defaultValue={String(editingRow?.contact_person ?? "")} />
            <Input label="No HP" name="phone" defaultValue={String(editingRow?.phone ?? "")} />
            <MultiFileInput
              label="Bukti Konfirmasi (foto WA)"
              name="confirmation_file"
              accept="image/*"
              required={!editingRow}
              existingFiles={existingConfirmationFiles}
              reportId={editingRow?.id}
              deleteExistingAction={
                editingRow ? deleteCustomerBaruAttachment : undefined
              }
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingRow ? "Update" : "Simpan"}</SubmitButton>
              {editingRow ? (
                <Link
                  href="/customer-baru?view=input"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : (
        <Panel title="Data Customer Baru" className="flex min-h-0 flex-col">
          <ReportTable
            rows={rows}
            editHrefBase="/customer-baru"
            viewHrefBase="/customer-baru"
            viewOwnerId={profile.role === "super_user" ? undefined : profile.id}
            deleteAction={profile.role === "super_user" ? deleteCustomerBaru : undefined}
            columns={[
              { key: "customer_new", label: "Customer" },
              { key: "sales_requester", label: "Sales" },
              { key: "bsoft_input_date", label: "Tanggal Bsoft", format: formatDateOnly },
              { key: "customer_id", label: "ID Customer" },
              { key: "contact_person", label: "CP" },
              { key: "phone", label: "No HP" },
            ]}
          />
        </Panel>
      )}
    </div>
  );
}
