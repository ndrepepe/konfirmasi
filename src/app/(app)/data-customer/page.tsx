import { createCustomerData } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerExcelImporter } from "@/components/customer-excel-importer";
import { SearchableTable } from "@/components/searchable-table";
import { StatusSelect } from "@/components/status-select";
import { Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Tambah Customer">
          <form action={createCustomerData} className="grid gap-4">
            <Input label="ID Customer" name="customer_code" />
            <BranchSelect branches={branches} profile={profile} />
            <Input label="Nama Customer" name="customer_name" />
            <StatusSelect />
            <SubmitButton />
          </form>
          <CustomerExcelImporter branches={branches} />
        </Panel>
        <Panel title="Daftar Customer">
          <form className="mb-4 grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[1fr_180px_160px_auto]">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Cari
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="ID atau nama customer"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </label>
            {canViewAllBranches(profile) ? (
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Cabang
                <select
                  name="branch_id"
                  defaultValue={params.branch_id ?? ""}
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Semua</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.code}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Status
              <select
                name="status"
                defaultValue={params.status ?? ""}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Semua</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </label>
            <button className="h-10 self-end rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800">
              Terapkan
            </button>
          </form>
          <p className="mb-3 text-xs text-slate-500">
            Data ditampilkan maksimal 500 baris per filter. Gunakan pencarian/filter untuk data
            besar.
          </p>
          <SearchableTable
            rows={customers.map((customer) => ({
              id: customer.id,
              cells: {
                customer_code: customer.customer_code,
                branch: customer.branches?.code ?? "-",
                customer_name: customer.customer_name,
                status: customer.status,
              },
            }))}
            columns={[
              { key: "customer_code", label: "ID Customer", strong: true },
              { key: "branch", label: "Cabang", filterable: true },
              { key: "customer_name", label: "Nama Customer" },
              { key: "status", label: "Status", filterable: true },
            ]}
            emptyLabel="Belum ada data customer."
          />
        </Panel>
      </div>
    </Guard>
  );
}
