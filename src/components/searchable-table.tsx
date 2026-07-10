"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SearchableSelect } from "@/components/searchable-select";

export type SearchableColumn = {
  key: string;
  label: string;
  filterable?: boolean;
  strong?: boolean;
};

export type SearchableRow = {
  id: string;
  cells: Record<string, string>;
};

export function SearchableTable({
  rows,
  columns,
  emptyLabel,
  showControls = true,
}: {
  rows: SearchableRow[];
  columns: SearchableColumn[];
  emptyLabel: string;
  showControls?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const filterableColumns = columns.filter((column) => column.filterable);
  const filterOptions = useMemo(
    () =>
      Object.fromEntries(
        filterableColumns.map((column) => [
          column.key,
          Array.from(new Set(rows.map((row) => row.cells[column.key]).filter(Boolean))).sort(),
        ]),
      ) as Record<string, string[]>,
    [filterableColumns, rows],
  );

  const filteredRows = useMemo(() => {
    if (!showControls) return rows;

    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        Object.values(row.cells).some((value) => value.toLowerCase().includes(normalizedQuery));

      const matchesFilters = Object.entries(filters).every(
        ([key, value]) => !value || row.cells[key] === value,
      );

      return matchesQuery && matchesFilters;
    });
  }, [filters, query, rows, showControls]);

  if (!rows.length) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {showControls ? (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari data..."
              className="h-11 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
            />
          </label>
          {filterableColumns.length ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {filterableColumns.map((column) => (
                <div key={column.key} className="min-w-0 sm:min-w-40">
                  <SearchableSelect
                    label={column.label}
                    required={false}
                    placeholder="Semua"
                    value={filters[column.key] ?? ""}
                    onChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        [column.key]: value,
                      }))
                    }
                    options={filterOptions[column.key].map((option) => ({
                      value: option,
                      label: option,
                    }))}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        {showControls
          ? `Menampilkan ${filteredRows.length} dari ${rows.length} data`
          : `Menampilkan ${rows.length} data`}
      </p>

      {filteredRows.length ? (
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="whitespace-nowrap px-3 py-3 sm:px-4">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={
                        column.strong
                          ? "whitespace-nowrap px-3 py-3 font-semibold text-slate-950 sm:px-4"
                          : "whitespace-nowrap px-3 py-3 text-slate-700 sm:px-4"
                      }
                    >
                      {row.cells[column.key] || "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Tidak ada data yang cocok dengan pencarian/filter.
        </div>
      )}
    </div>
  );
}
