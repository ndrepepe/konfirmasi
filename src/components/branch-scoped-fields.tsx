"use client";

import { useEffect, useMemo, useState } from "react";
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
  customers = [],
  defaultBranchId = "",
  defaultCustomerName = "",
  loadCustomersByBranch = false,
  customerStatus,
}: {
  branches: Branch[];
  customers?: Customer[];
  defaultBranchId?: string;
  defaultCustomerName?: string;
  loadCustomersByBranch?: boolean;
  customerStatus?: string;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadedCustomers, setLoadedCustomers] = useState<Customer[]>([]);
  const availableCustomers = loadCustomersByBranch ? loadedCustomers : customers;
  const filteredCustomers = useMemo(
    () => {
      if (loadCustomersByBranch && !branchId) return [];
      return branchId
        ? availableCustomers.filter((customer) => customer.branch_id === branchId)
        : availableCustomers;
    },
    [availableCustomers, branchId, loadCustomersByBranch],
  );
  const customerOptions = useMemo(() => {
    const options = filteredCustomers.map((customer) => ({
      value: customer.customer_name,
      label: `${customer.customer_code} - ${customer.customer_name}${
        customer.branches?.name ? ` (${customer.branches.name})` : ""
      }`,
      searchText: `${customer.customer_code} ${customer.customer_name} ${
        customer.branches?.name ?? ""
      } ${customer.branches?.code ?? ""}`,
    }));

    if (customerName && !options.some((option) => option.value === customerName)) {
      options.unshift({ value: customerName, label: customerName, searchText: customerName });
    }

    return options;
  }, [customerName, filteredCustomers]);

  useEffect(() => {
    if (!loadCustomersByBranch) return;

    if (!branchId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        branch_id: branchId,
        limit: "100",
      });
      if (customerStatus) params.set("status", customerStatus);
      if (customerSearch.trim()) params.set("q", customerSearch.trim());

      fetch(`/api/customers?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Gagal mengambil data customer.");
          return response.json() as Promise<{ customers: Customer[] }>;
        })
        .then((payload) => setLoadedCustomers(payload.customers))
        .catch((error) => {
          if (error.name !== "AbortError") setLoadedCustomers([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [branchId, customerSearch, customerStatus, loadCustomersByBranch]);

  function changeBranch(value: string) {
    setBranchId(value);
    if (
      customerName &&
      !availableCustomers.some((customer) => customer.branch_id === value && customer.customer_name === customerName)
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
        onSearchQueryChange={setCustomerSearch}
        options={customerOptions}
      />
    </>
  );
}
