import { createSales } from "@/app/actions/master-data";
import { Guard } from "@/components/app-shell";
import { SalesExcelImporter } from "@/components/sales-excel-importer";
import { SearchableTable } from "@/components/searchable-table";
import { Input, PageHeader, Panel, Select, SubmitButton } from "@/components/ui";
import { StatusSelect } from "@/components/status-select";
import { requireProfile } from "@/lib/auth";
import { getBranches, getSales } from "@/lib/data";

export default async function DataSalesPage() {
  const profile = await requireProfile();
  const [branches, sales] = await Promise.all([getBranches(), getSales()]);

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
            <Select label="Cabang" name="branch_id">
              <option value="">Pilih cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </Select>
            <Input label="Nama Sales" name="sales_name" />
            <StatusSelect />
            <SubmitButton />
          </form>
          <SalesExcelImporter branches={branches} />
        </Panel>
        <Panel title="Daftar Sales">
          <SearchableTable
            rows={sales.map((item) => ({
              id: item.id,
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
          />
        </Panel>
      </div>
    </Guard>
  );
}
