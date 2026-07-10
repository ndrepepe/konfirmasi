import { SearchableSelect } from "@/components/searchable-select";
import type { Sales } from "@/lib/types";

export function SalesSelect({
  label,
  name,
  sales,
  defaultValue,
}: {
  label: string;
  name: string;
  sales: Sales[];
  defaultValue?: string;
}) {
  return (
    <SearchableSelect
      label={label}
      name={name}
      placeholder="Pilih sales"
      defaultValue={defaultValue}
      options={sales.map((item) => ({
        value: item.sales_name,
        label: `${item.sales_code} - ${item.sales_name}${
          item.branches?.name ? ` (${item.branches.name})` : ""
        }`,
        searchText: `${item.sales_code} ${item.sales_name} ${item.branches?.name ?? ""} ${
          item.branches?.code ?? ""
        }`,
      }))}
    />
  );
}
