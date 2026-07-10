import { createSales, importSales } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { SearchableTable } from "@/components/searchable-table";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
          <div className="mt-6 border-t border-slate-200 pt-5">
            <a
              href="/templates/template-data-sales.xlsx"
              className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            >
              Download template Excel
            </a>
            <form action={importSales} className="mt-4 grid gap-4">
              <FileInput label="File Excel" name="excel_file" accept=".xlsx" />
              <SubmitButton>Import Excel</SubmitButton>
            </form>
          </div>
        </Panel>
        <Panel title="Daftar Sales">
          <SearchableTable
            rows={sales.map((item) => ({
              id: item.id,
              cells: {
                sales_code: item.sales_code,
                sales_name: item.sales_name,
                status: item.status,
              },
            }))}
            columns={[
              { key: "sales_code", label: "ID Sales", strong: true },
              { key: "sales_name", label: "Nama Sales" },
              { key: "status", label: "Status", filterable: true },
            ]}
            emptyLabel="Belum ada data sales."
          />
        </Panel>
      </div>
    </Guard>
  );
}
