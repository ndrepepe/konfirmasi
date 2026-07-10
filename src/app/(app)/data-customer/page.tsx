import { createCustomerData, importCustomerData } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { BranchSelect } from "@/components/branch-select";
import { StatusSelect } from "@/components/status-select";
import { EmptyState, FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
          {customers.length ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">ID Customer</th>
                    <th className="px-4 py-3">Cabang</th>
                    <th className="px-4 py-3">Nama Customer</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">
                        {customer.customer_code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {customer.branches?.code ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {customer.customer_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {customer.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Belum ada data customer." />
          )}
        </Panel>
      </div>
    </Guard>
  );
}
