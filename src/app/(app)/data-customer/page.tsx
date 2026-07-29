import Link from "next/link";
import { Suspense } from "react";
import {
  createCustomerData,
  deleteCustomerData,
  updateCustomerData,
} from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerExcelImporter } from "@/components/customer-excel-importer";
import { DataPanelSkeleton, FormPanelSkeleton } from "@/components/loading-panels";
import { PageSubnav, type PageView } from "@/components/page-subnav";
import { SearchableTable } from "@/components/searchable-table";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusSelect } from "@/components/status-select";
import { Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getCustomers } from "@/lib/data";
import { getConfiguredBranchIds } from "@/lib/permissions";

export default async function DataCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    branch_id?: string;
    status?: string;
    edit?: string;
    error?: string;
    view?: PageView;
  }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const suspenseKey = JSON.stringify(params);
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <Guard profile={profile} href="/data-customer">
      <PageHeader
        title="Data Customer"
        description="Kelola master customer berdasarkan cabang untuk digunakan pada Pemenuhan PO."
      />
      <PageSubnav
        baseHref="/data-customer"
        activeView={activeView}
      />
      <Suspense
        key={suspenseKey}
        fallback={
          activeView === "input" ? (
            <FormPanelSkeleton title="Tambah Customer" />
          ) : (
            <DataPanelSkeleton title="Daftar Customer" />
          )
        }
      >
        <DataCustomerContent profile={profile} params={params} />
      </Suspense>
    </Guard>
  );
}

async function DataCustomerContent({
  profile,
  params,
}: {
  profile: Awaited<ReturnType<typeof requireProfile>>;
  params: {
    q?: string;
    branch_id?: string;
    status?: string;
    edit?: string;
    error?: string;
    view?: PageView;
  };
}) {
  const [branches, customers] = await Promise.all([
    getBranches(),
    getCustomers(profile, {
      search: params.q,
      branchId: params.branch_id,
      status: params.status,
      limit: 500,
    }),
  ]);
  const editingCustomer = customers.find((customer) => customer.id === params.edit);
  const configuredBranchIds = getConfiguredBranchIds(profile);
  const inputBranches =
    profile.role === "super_user"
      ? branches
      : branches.filter((branch) => configuredBranchIds.includes(branch.id));
  const editHrefFor = (id: string) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.branch_id) query.set("branch_id", params.branch_id);
    if (params.status) query.set("status", params.status);
    query.set("view", "input");
    query.set("edit", id);
    return `/data-customer?${query.toString()}`;
  };
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <div className="grid gap-5">
      {activeView === "input" ? (
        <Panel title={editingCustomer ? "Edit Customer" : "Tambah Customer"} className="flex min-h-0 flex-col">
          {params.error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}
          <form action={editingCustomer ? updateCustomerData : createCustomerData} className="grid gap-4">
            {editingCustomer ? <input type="hidden" name="id" value={editingCustomer.id} /> : null}
            <Input label="ID Customer" name="customer_code" defaultValue={editingCustomer?.customer_code} />
            <BranchSelect
              branches={branches}
              profile={profile}
              defaultValue={editingCustomer?.branch_id}
              limitToAssigned={profile.role !== "super_user"}
            />
            <Input label="Nama Customer" name="customer_name" defaultValue={editingCustomer?.customer_name} />
            <StatusSelect defaultValue={editingCustomer?.status ?? "Aktif"} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingCustomer ? "Update" : "Simpan"}</SubmitButton>
              {editingCustomer ? (
                <Link
                  href="/data-customer?view=input"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
          <CustomerExcelImporter branches={branches} />
        </Panel>
      ) : (
        <Panel title="Daftar Customer" className="flex min-h-0 flex-col">
          <p className="mb-3 text-xs text-slate-500">
            Data ditampilkan maksimal 500 baris per hasil pencarian/filter.
          </p>
          <form className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_180px_160px_auto]">
            <input type="hidden" name="view" value="data" />
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Cari
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="ID atau nama customer"
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
              />
            </label>
            {profile.role === "super_user" || inputBranches.length > 1 ? (
              <SearchableSelect
                label="Cabang"
                name="branch_id"
                required={false}
                defaultValue={params.branch_id ?? ""}
                placeholder="Semua"
                options={inputBranches.map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                  searchText: `${branch.code} ${branch.name}`,
                }))}
              />
            ) : null}
            <SearchableSelect
              label="Status"
              name="status"
              required={false}
              defaultValue={params.status ?? ""}
              placeholder="Semua"
              options={[
                { value: "Aktif", label: "Aktif" },
                { value: "Nonaktif", label: "Nonaktif" },
              ]}
            />
            <SubmitButton className="self-end" pendingText="Menerapkan...">
              Terapkan
            </SubmitButton>
          </form>
          <SearchableTable
            rows={customers.map((customer) => ({
              id: customer.id,
              editHref: editHrefFor(customer.id),
              deleteLabel: `customer ${customer.customer_name}`,
              cells: {
                customer_code: customer.customer_code,
                branch: customer.branches?.name ?? "-",
                customer_name: customer.customer_name,
                status: customer.status,
              },
            }))}
            columns={[
              { key: "customer_code", label: "ID Customer", strong: true },
              { key: "branch", label: "Cabang" },
              { key: "customer_name", label: "Nama Customer" },
              { key: "status", label: "Status" },
            ]}
            emptyLabel="Belum ada data customer."
            showControls={false}
            deleteAction={profile.role === "super_user" ? deleteCustomerData : undefined}
          />
        </Panel>
      )}
    </div>
  );
}
