import Link from "next/link";
import { Suspense } from "react";
import {
  createPemenuhanPo,
  deletePemenuhanPo,
  deletePemenuhanPoAttachment,
  updatePemenuhanPo,
} from "@/app/actions/reports";
import { Guard } from "@/components/app-shell";
import { BranchScopedCustomerSelect } from "@/components/branch-scoped-fields";
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

export default async function PemenuhanPoPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; view?: PageView }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const activeView =
    profile.role === "accounting"
      ? "data"
      : params.edit
        ? "input"
        : params.view === "data"
          ? "data"
          : "input";

  return (
    <Guard profile={profile} href="/pemenuhan-po">
      <PageHeader
        title="Konfirmasi PO"
        description="Catat data PO, lampiran PO, dan bukti konfirmasi."
      />
      <PageSubnav
        baseHref="/pemenuhan-po"
        activeView={activeView}
        showInput={profile.role !== "accounting"}
      />
      <Suspense
        key={`${params.view ?? "input"}-${params.edit ?? "new"}`}
        fallback={
          activeView === "input" ? (
            <FormPanelSkeleton title="Form Konfirmasi PO" />
          ) : (
            <DataPanelSkeleton title="Data Konfirmasi PO" />
          )
        }
      >
        <PemenuhanPoContent profile={profile} params={params} />
      </Suspense>
    </Guard>
  );
}

async function PemenuhanPoContent({
  profile,
  params,
}: {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  params: { edit?: string; view?: PageView };
}) {
  const [branches, rows] = await Promise.all([
    getBranches(),
    getReports("pemenuhan_po_reports", profile, {
      includeAllCreatorsInAssignedBranches: profile.role === "accounting",
    }),
  ]);
  const editingRow = rows.find((row) => row.id === params.edit);
  const canInputPemenuhanPo = profile.role !== "accounting";
  const configuredBranchIds = getConfiguredBranchIds(profile);
  const inputBranches =
    profile.role === "super_user"
      ? branches
      : branches.filter((branch) => configuredBranchIds.includes(branch.id));
  const activeView = !canInputPemenuhanPo
    ? "data"
    : params.edit
      ? "input"
      : params.view === "data"
        ? "data"
        : "input";
  const [existingPoFiles, existingConfirmationFiles] = editingRow
    ? await Promise.all([
        getAttachmentLinks(editingRow.po_file),
        getAttachmentLinks(editingRow.confirmation_file),
      ])
    : [[], []];
  const dataPanel = (
    <Panel title="Data Konfirmasi PO" className="flex min-h-0 flex-col">
      <ReportTable
        rows={rows}
        editHrefBase={canInputPemenuhanPo ? "/pemenuhan-po" : undefined}
        viewHrefBase="/pemenuhan-po"
        viewOwnerId={profile.role === "admin_cabang" ? profile.id : undefined}
        deleteAction={profile.role === "super_user" ? deletePemenuhanPo : undefined}
        columns={[
          { key: "customer_name", label: "Customer" },
          { key: "sales_name", label: "Sales" },
          { key: "po_date", label: "Tanggal PO", format: formatDateOnly },
          { key: "po_number", label: "No PO" },
          { key: "contact_person", label: "CP" },
          { key: "phone", label: "No HP" },
        ]}
      />
    </Panel>
  );

  return (
    <>
      {activeView === "input" ? (
        <Panel title={editingRow ? "Edit Konfirmasi PO" : "Form Konfirmasi PO"} className="flex min-h-0 flex-col">
          <form action={editingRow ? updatePemenuhanPo : createPemenuhanPo} className="grid gap-4">
            {editingRow ? <input type="hidden" name="id" value={editingRow.id} /> : null}
            <BranchScopedCustomerSelect
              branches={inputBranches}
              defaultBranchId={editingRow?.branch_id}
              defaultCustomerName={String(editingRow?.customer_name ?? "")}
              loadCustomersByBranch
              customerStatus="Aktif"
              defaultSalesName={String(editingRow?.sales_name ?? "")}
              loadSalesByBranch
              salesLabel="Nama Sales"
              salesNameField="sales_name"
              salesStatus="Aktif"
            />
            <Input
              label="Tanggal PO"
              name="po_date"
              type="date"
              defaultValue={toDateInputValue(editingRow?.po_date)}
            />
            <Input label="No PO" name="po_number" defaultValue={String(editingRow?.po_number ?? "")} />
            <MultiFileInput
              label="File PO"
              name="po_file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              required={!editingRow}
              existingFiles={existingPoFiles}
              reportId={editingRow?.id}
              deleteExistingAction={
                editingRow ? deletePemenuhanPoAttachment : undefined
              }
            />
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
                editingRow ? deletePemenuhanPoAttachment : undefined
              }
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingRow ? "Update" : "Simpan"}</SubmitButton>
              {editingRow ? (
                <Link
                  href="/pemenuhan-po?view=input"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
      ) : (
        <div className="grid gap-5">{dataPanel}</div>
      )}
    </>
  );
}
