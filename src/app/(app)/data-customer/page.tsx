import { createCustomerData, importCustomerData } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { SearchableTable } from "@/components/searchable-table";
import { StatusSelect } from "@/components/status-select";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches, getCustomers } from "@/lib/data";

export default async function DataCustomerPage() {
  const profile = await requireProfile();
  const [branches, customers] = await Promise.all([getBranches(), getCustomers(profile)]);

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
          <div className="mt-6 border-t border-slate-200 pt-5">
            <a
              href="/templates/template-data-customer.xlsx"
              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Download template Excel
            </a>
            <form action={importCustomerData} className="mt-4 grid gap-4">
              <FileInput label="File Excel" name="excel_file" accept=".xlsx" />
              <SubmitButton>Import Excel</SubmitButton>
            </form>
          </div>
        </Panel>
        <Panel title="Daftar Customer">
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
