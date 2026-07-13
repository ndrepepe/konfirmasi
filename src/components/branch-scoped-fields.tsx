"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import type { Branch, Customer, Sales } from "@/lib/types";

function branchOptions(branches: Branch[]) {
  return branches.map((branch) => ({
    value: branch.id,
    label: `${branch.code} - ${branch.name}`,
    searchText: `${branch.code} ${branch.name}`,
  }));
}

export function BranchScopedSalesSelect({
  branches,
  sales,
  defaultBranchId = "",
  defaultSalesName = "",
  children,
}: {
  branches: Branch[];
  sales: Sales[];
  defaultBranchId?: string;
  defaultSalesName?: string;
  children?: ReactNode;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [salesName, setSalesName] = useState(defaultSalesName);
  const filteredSales = useMemo(
    () => (branchId ? sales.filter((item) => item.branch_id === branchId) : sales),
    [branchId, sales],
  );

  function changeBranch(value: string) {
    setBranchId(value);
    if (salesName && !sales.some((item) => item.branch_id === value && item.sales_name === salesName)) {
      setSalesName("");
    }
  }

  return (
    <>
      <SearchableSelect
        label="Cabang"
        name="branch_id"
        placeholder="Pilih cabang"
        value={branchId}
        onChange={changeBranch}
        options={branchOptions(branches)}
      />
      {children}
      <SearchableSelect
        label="Sales yg mengajukan"
        name="sales_requester"
        placeholder="Pilih sales"
        value={salesName}
        onChange={setSalesName}
        options={filteredSales.map((item) => ({
          value: item.sales_name,
          label: `${item.sales_code} - ${item.sales_name}${
            item.branches?.name ? ` (${item.branches.name})` : ""
          }`,
          searchText: `${item.sales_code} ${item.sales_name} ${item.branches?.name ?? ""} ${
            item.branches?.code ?? ""
          }`,
        }))}
      />
    </>
  );
}

export function BranchScopedCustomerSelect({
  branches,
  customers,
  defaultBranchId = "",
  defaultCustomerName = "",
}: {
  branches: Branch[];
  customers: Customer[];
  defaultBranchId?: string;
  defaultCustomerName?: string;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const filteredCustomers = useMemo(
    () => (branchId ? customers.filter((customer) => customer.branch_id === branchId) : customers),
    [branchId, customers],
  );

  function changeBranch(value: string) {
    setBranchId(value);
    if (
      customerName &&
      !customers.some((customer) => customer.branch_id === value && customer.customer_name === customerName)
    ) {
      setCustomerName("");
    }
  }

  return (
    <>
      <SearchableSelect
        label="Cabang"
        name="branch_id"
        placeholder="Pilih cabang"
        value={branchId}
        onChange={changeBranch}
        options={branchOptions(branches)}
      />
      <SearchableSelect
        label="Nama Customer"
        name="customer_name"
        placeholder="Pilih customer"
        value={customerName}
        onChange={setCustomerName}
        options={filteredCustomers.map((customer) => ({
          value: customer.customer_name,
          label: `${customer.customer_code} - ${customer.customer_name}${
            customer.branches?.name ? ` (${customer.branches.name})` : ""
          }`,
          searchText: `${customer.customer_code} ${customer.customer_name} ${
            customer.branches?.name ?? ""
          } ${customer.branches?.code ?? ""}`,
        }))}
      />
    </>
  );
}
