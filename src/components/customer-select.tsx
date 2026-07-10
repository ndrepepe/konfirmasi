import { SearchableSelect } from "@/components/searchable-select";
import type { Customer } from "@/lib/types";

export function CustomerSelect({
  customers,
  defaultValue,
}: {
  customers: Customer[];
  defaultValue?: string;
}) {
  return (
    <SearchableSelect
      label="Nama Customer"
      name="customer_name"
      placeholder="Pilih customer"
      defaultValue={defaultValue}
      options={customers.map((customer) => ({
        value: customer.customer_name,
        label: `${customer.customer_code} - ${customer.customer_name}${
          customer.branches?.name ? ` (${customer.branches.name})` : ""
        }`,
        searchText: `${customer.customer_code} ${customer.customer_name} ${
          customer.branches?.name ?? ""
        } ${customer.branches?.code ?? ""}`,
      }))}
    />
  );
}
