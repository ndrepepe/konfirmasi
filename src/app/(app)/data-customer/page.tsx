import { createCustomerData } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { CustomerExcelImporter } from "@/components/customer-excel-importer";
import { SearchableTable } from "@/components/searchable-table";
import { StatusSelect } from "@/components/status-select";
import { CompactInputDataLayout, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getCustomers } from "@/lib/data";

export default async function DataCustomerPage() {
  const profile = await requireProfile();
  const [branches, customers] = await Promise.all([
    getBranches(),
    getCustomers(profile, {
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
            Data ditampilkan maksimal 500 baris. Gunakan pencarian/filter tabel untuk mempersempit
            data.
          </p>
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
              { key: "branch", label: "Cabang", filterable: true },
              { key: "customer_name", label: "Nama Customer" },
              { key: "status", label: "Status", filterable: true },
            ]}
            emptyLabel="Belum ada data customer."
          />
        </Panel>
      </CompactInputDataLayout>
    </Guard>
  );
}
