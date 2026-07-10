import { Select } from "@/components/ui";
import type { Customer } from "@/lib/types";

export function CustomerSelect({ customers }: { customers: Customer[] }) {
  return (
    <Select label="Nama Customer" name="customer_name">
      <option value="">Pilih customer</option>
      {customers.map((customer) => (
        <option key={customer.id} value={customer.customer_name}>
          {customer.customer_code} - {customer.customer_name}
          {customer.branches?.code ? ` (${customer.branches.code})` : ""}
        </option>
      ))}
    </Select>
  );
}
