import { createCustomerData } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerExcelImporter } from "@/components/customer-excel-importer";
import { SearchableTable } from "@/components/searchable-table";
import { SearchableSelect } from "@/components/searchable-select";
import { StatusSelect } from "@/components/status-select";
import { CompactInputDataLayout, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getCustomers } from "@/lib/data";
import { canViewAllBranches } from "@/lib/permissions";

export default async function DataCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    branch_id?: string;
    status?: string;
  }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [branches, customers] = await Promise.all([
    getBranches(),
    getCustomers(profile, {
      search: params.q,
      branchId: params.branch_id,
      status: params.status,
      limit: 500,
    }),
  ]);

  return (
    <Guard profile={profile} href="/data-customer">
      <PageHeader
        title="Data Customer"
        description="Kelola master customer berdasarkan cabang untuk digunakan pada Pemenuhan PO."
      />
      <CompactInputDataLayout>
        <Panel title="Tambah Customer" className="flex min-h-0 flex-col">
          <form action={createCustomerData} className="grid gap-4">
            <Input label="ID Customer" name="customer_code" />
            <BranchSelect branches={branches} profile={profile} />
            <Input label="Nama Customer" name="customer_name" />
            <StatusSelect />
            <SubmitButton />
          </form>
          <CustomerExcelImporter branches={branches} />
        </Panel>
        <Panel title="Daftar Customer" className="flex min-h-0 flex-col">
          <p className="mb-3 text-xs text-slate-500">
            Data ditampilkan maksimal 500 baris per hasil pencarian/filter.
          </p>
          <form className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_180px_160px_auto]">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Cari
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="ID atau nama customer"
                className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
              />
            </label>
            {canViewAllBranches(profile) ? (
              <SearchableSelect
                label="Cabang"
                name="branch_id"
                required={false}
                defaultValue={params.branch_id ?? ""}
                placeholder="Semua"
                options={branches.map((branch) => ({
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
            <button className="h-11 self-end rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 sm:h-10">
              Terapkan
            </button>
          </form>
          <SearchableTable
            rows={customers.map((customer) => ({
              id: customer.id,
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
          />
        </Panel>
      </CompactInputDataLayout>
    </Guard>
  );
}
