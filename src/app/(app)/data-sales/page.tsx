import Link from "next/link";
import { Suspense } from "react";
import { createSales, deleteSales, updateSales } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { DataPanelSkeleton, FormPanelSkeleton } from "@/components/loading-panels";
import { PageSubnav, type PageView } from "@/components/page-subnav";
import { SalesExcelImporter } from "@/components/sales-excel-importer";
import { SearchableTable } from "@/components/searchable-table";
import {
  Input,
  PageHeader,
  Panel,
  SubmitButton,
} from "@/components/ui";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusSelect } from "@/components/status-select";
import { requireProfile } from "@/lib/auth";
import { getBranches, getSales } from "@/lib/data";
import { getConfiguredBranchIds } from "@/lib/permissions";

export default async function DataSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string; view?: PageView }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <Guard profile={profile} href="/data-sales">
      <PageHeader
        title="Data Sales"
        description="Kelola master sales yang digunakan pada Customer Baru dan Konfirmasi PO."
      />
      <PageSubnav
        baseHref="/data-sales"
        activeView={activeView}
      />
      <Suspense
        key={`${params.view ?? "input"}-${params.edit ?? "new"}`}
        fallback={
          activeView === "input" ? (
            <FormPanelSkeleton title="Tambah Sales" />
          ) : (
            <DataPanelSkeleton title="Daftar Sales" />
          )
        }
      >
        <DataSalesContent profile={profile} params={params} />
      </Suspense>
    </Guard>
  );
}

async function DataSalesContent({
  profile,
  params,
}: {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  params: { edit?: string; error?: string; view?: PageView };
}) {
  const [branches, sales] = await Promise.all([getBranches(), getSales(profile)]);
  const editingSales = sales.find((item) => item.id === params.edit);
  const configuredBranchIds = getConfiguredBranchIds(profile);
  const inputBranches =
    profile.role === "super_user"
      ? branches
      : branches.filter((branch) => configuredBranchIds.includes(branch.id));
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <div className="grid gap-5">
      {activeView === "input" ? (
        <Panel title={editingSales ? "Edit Sales" : "Tambah Sales"} className="flex min-h-0 flex-col">
          {params.error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}
          <form action={editingSales ? updateSales : createSales} className="grid gap-4">
            {editingSales ? <input type="hidden" name="id" value={editingSales.id} /> : null}
            <Input label="ID Sales" name="sales_code" defaultValue={editingSales?.sales_code} />
            <SearchableSelect
              label="Cabang"
              name="branch_id"
              placeholder="Pilih cabang"
              defaultValue={editingSales?.branch_id ?? ""}
              options={inputBranches.map((branch) => ({
                value: branch.id,
                label: `${branch.code} - ${branch.name}`,
                searchText: `${branch.code} ${branch.name}`,
              }))}
            />
            <Input label="Nama Sales" name="sales_name" defaultValue={editingSales?.sales_name} />
            <StatusSelect defaultValue={editingSales?.status ?? "Aktif"} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingSales ? "Update" : "Simpan"}</SubmitButton>
              {editingSales ? (
                <Link
                  href="/data-sales?view=input"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
          <SalesExcelImporter branches={branches} />
        </Panel>
      ) : (
        <Panel title="Daftar Sales" className="flex min-h-0 flex-col">
          <SearchableTable
            rows={sales.map((item) => ({
              id: item.id,
              editHref: `/data-sales?view=input&edit=${item.id}`,
              deleteLabel: `sales ${item.sales_name}`,
              cells: {
                sales_code: item.sales_code,
                branch: item.branches?.name ?? "-",
                sales_name: item.sales_name,
                status: item.status,
              },
            }))}
            columns={[
              { key: "sales_code", label: "ID Sales", strong: true },
              { key: "branch", label: "Cabang", filterable: true },
              { key: "sales_name", label: "Nama Sales" },
              { key: "status", label: "Status", filterable: true },
            ]}
            emptyLabel="Belum ada data sales."
            deleteAction={profile.role === "super_user" ? deleteSales : undefined}
          />
        </Panel>
      )}
    </div>
  );
}
