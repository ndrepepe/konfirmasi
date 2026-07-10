import { Select } from "@/components/ui";
import type { Sales } from "@/lib/types";

export function SalesSelect({
  label,
  name,
  sales,
}: {
  label: string;
  name: string;
  sales: Sales[];
}) {
  return (
    <Select label={label} name={name}>
      <option value="">Pilih sales</option>
      {sales.map((item) => (
        <option key={item.id} value={item.sales_name}>
          {item.sales_code} - {item.sales_name}
          {item.branches?.name ? ` (${item.branches.name})` : ""}
        </option>
      ))}
    </Select>
  );
}
