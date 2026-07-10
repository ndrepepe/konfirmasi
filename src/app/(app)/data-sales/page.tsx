import { createSales } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { EmptyState, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { requireProfile } from "@/lib/auth";
import { getSales } from "@/lib/data";

export default async function DataSalesPage() {
  const profile = await requireProfile();
  const sales = await getSales();

  return (
    <Guard profile={profile} href="/data-sales">
      <PageHeader
        title="Data Sales"
        description="Kelola master sales yang digunakan pada Customer Baru dan Pemenuhan PO."
      />
      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <Panel title="Tambah Sales">
          <form action={createSales} className="grid gap-4">
            <Input label="ID Sales" name="sales_code" />
            <Input label="Nama Sales" name="sales_name" />
            <StatusSelect />
            <SubmitButton />
          </form>
        </Panel>
        <Panel title="Daftar Sales">
          {sales.length ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">ID Sales</th>
                    <th className="px-4 py-3">Nama Sales</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {sales.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">
                        {item.sales_code}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {item.sales_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {item.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Belum ada data sales." />
          )}
        </Panel>
      </div>
    </Guard>
  );
}
