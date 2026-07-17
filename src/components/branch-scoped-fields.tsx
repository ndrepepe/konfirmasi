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

function toSalesOptions(sales: Sales[], salesName: string) {
  const options = sales.map((item) => ({
    value: item.sales_name,
    label: `${item.sales_code} - ${item.sales_name}${
      item.branches?.name ? ` (${item.branches.name})` : ""
    }`,
    searchText: `${item.sales_code} ${item.sales_name} ${item.branches?.name ?? ""} ${
      item.branches?.code ?? ""
    }`,
  }));

  if (salesName && !options.some((option) => option.value === salesName)) {
    options.unshift({ value: salesName, label: salesName, searchText: salesName });
  }

  return options;
}

function toCustomerOptions(customers: Customer[], customerName: string) {
  const options = customers.map((customer) => ({
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
}

export function BranchScopedSalesSelect({
  branches,
  sales = [],
  defaultBranchId = "",
  defaultSalesName = "",
  loadSalesByBranch = false,
  salesLabel = "Sales yg mengajukan",
  salesNameField = "sales_requester",
  salesStatus,
  children,
}: {
  branches: Branch[];
  sales?: Sales[];
  defaultBranchId?: string;
  defaultSalesName?: string;
  loadSalesByBranch?: boolean;
  salesLabel?: string;
  salesNameField?: string;
  salesStatus?: string;
  children?: ReactNode;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [salesName, setSalesName] = useState(defaultSalesName);
  const [salesSearch, setSalesSearch] = useState("");
  const [shouldLoadSales, setShouldLoadSales] = useState(false);
  const [loadedSales, setLoadedSales] = useState<Sales[]>([]);
  const availableSales = loadSalesByBranch ? loadedSales : sales;
  const filteredSales = useMemo(
    () => (branchId ? availableSales.filter((item) => item.branch_id === branchId) : availableSales),
    [availableSales, branchId],
  );

  useEffect(() => {
    if (!loadSalesByBranch || !shouldLoadSales || !branchId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        branch_id: branchId,
        limit: "100",
      });
      if (salesStatus) params.set("status", salesStatus);
      if (salesSearch.trim()) params.set("q", salesSearch.trim());

      fetch(`/api/sales?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Gagal mengambil data sales.");
          return response.json() as Promise<{ sales: Sales[] }>;
        })
        .then((payload) => setLoadedSales(payload.sales))
        .catch((error) => {
          if (error.name !== "AbortError") setLoadedSales([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [branchId, loadSalesByBranch, salesSearch, salesStatus, shouldLoadSales]);

  function changeBranch(value: string) {
    setBranchId(value);
    setLoadedSales([]);
    setSalesSearch("");
    setShouldLoadSales(false);
    if (salesName && !availableSales.some((item) => item.branch_id === value && item.sales_name === salesName)) {
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
        label={salesLabel}
        name={salesNameField}
        placeholder="Pilih sales"
        value={salesName}
        onChange={setSalesName}
        onOpen={() => setShouldLoadSales(true)}
        onSearchQueryChange={setSalesSearch}
        options={toSalesOptions(filteredSales, salesName)}
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
  sales = [],
  defaultSalesName = "",
  loadSalesByBranch = false,
  salesLabel,
  salesNameField,
  salesStatus,
}: {
  branches: Branch[];
  customers?: Customer[];
  defaultBranchId?: string;
  defaultCustomerName?: string;
  loadCustomersByBranch?: boolean;
  customerStatus?: string;
  sales?: Sales[];
  defaultSalesName?: string;
  loadSalesByBranch?: boolean;
  salesLabel?: string;
  salesNameField?: string;
  salesStatus?: string;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId);
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [customerSearch, setCustomerSearch] = useState("");
  const [shouldLoadCustomers, setShouldLoadCustomers] = useState(false);
  const [loadedCustomers, setLoadedCustomers] = useState<Customer[]>([]);
  const [salesName, setSalesName] = useState(defaultSalesName);
  const [salesSearch, setSalesSearch] = useState("");
  const [shouldLoadSales, setShouldLoadSales] = useState(false);
  const [loadedSales, setLoadedSales] = useState<Sales[]>([]);
  const availableCustomers = loadCustomersByBranch ? loadedCustomers : customers;
  const availableSales = loadSalesByBranch ? loadedSales : sales;
  const filteredCustomers = useMemo(
    () => {
      if (loadCustomersByBranch && !branchId) return [];
      return branchId
        ? availableCustomers.filter((customer) => customer.branch_id === branchId)
        : availableCustomers;
    },
    [availableCustomers, branchId, loadCustomersByBranch],
  );
  const filteredSales = useMemo(
    () => (branchId ? availableSales.filter((item) => item.branch_id === branchId) : availableSales),
    [availableSales, branchId],
  );
  const customerOptions = useMemo(
    () => toCustomerOptions(filteredCustomers, customerName),
    [customerName, filteredCustomers],
  );
  const salesOptions = useMemo(
    () => toSalesOptions(filteredSales, salesName),
    [filteredSales, salesName],
  );

  useEffect(() => {
    if (!loadCustomersByBranch || !shouldLoadCustomers) return;

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
  }, [branchId, customerSearch, customerStatus, loadCustomersByBranch, shouldLoadCustomers]);

  useEffect(() => {
    if (!loadSalesByBranch || !shouldLoadSales || !branchId) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        branch_id: branchId,
        limit: "100",
      });
      if (salesStatus) params.set("status", salesStatus);
      if (salesSearch.trim()) params.set("q", salesSearch.trim());

      fetch(`/api/sales?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Gagal mengambil data sales.");
          return response.json() as Promise<{ sales: Sales[] }>;
        })
        .then((payload) => setLoadedSales(payload.sales))
        .catch((error) => {
          if (error.name !== "AbortError") setLoadedSales([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [branchId, loadSalesByBranch, salesSearch, salesStatus, shouldLoadSales]);

  function changeBranch(value: string) {
    setBranchId(value);
    setLoadedCustomers([]);
    setCustomerSearch("");
    setShouldLoadCustomers(false);
    setLoadedSales([]);
    setSalesSearch("");
    setShouldLoadSales(false);
    if (
      customerName &&
      !availableCustomers.some((customer) => customer.branch_id === value && customer.customer_name === customerName)
    ) {
      setCustomerName("");
    }
    if (salesName && !availableSales.some((item) => item.branch_id === value && item.sales_name === salesName)) {
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
      <SearchableSelect
        label="Nama Customer"
        name="customer_name"
        placeholder="Pilih customer"
        value={customerName}
        onChange={setCustomerName}
        onOpen={() => setShouldLoadCustomers(true)}
        onSearchQueryChange={setCustomerSearch}
        options={customerOptions}
      />
      {salesLabel && salesNameField ? (
        <SearchableSelect
          label={salesLabel}
          name={salesNameField}
          placeholder="Pilih sales"
          value={salesName}
          onChange={setSalesName}
          onOpen={() => setShouldLoadSales(true)}
          onSearchQueryChange={setSalesSearch}
          options={salesOptions}
        />
      ) : null}
    </>
  );
}
