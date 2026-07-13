"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import type { Branch } from "@/lib/types";

export function MultiBranchSelect({
  branches,
  defaultValues = [],
}: {
  branches: Branch[];
  defaultValues?: string[];
}) {
  const [selectedValues, setSelectedValues] = useState(defaultValues);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const filteredBranches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return branches;

    return branches.filter((branch) =>
      `${branch.code} ${branch.name}`.toLowerCase().includes(normalizedQuery),
    );
  }, [branches, query]);

  const selectedBranches = branches.filter((branch) => selectedSet.has(branch.id));

  function toggleBranch(branchId: string) {
    setSelectedValues((current) =>
      current.includes(branchId)
        ? current.filter((value) => value !== branchId)
        : [...current, branchId],
    );
  }

  function removeBranch(branchId: string) {
    setSelectedValues((current) => current.filter((value) => value !== branchId));
  }

  return (
    <div
      ref={wrapperRef}
      className="relative grid gap-1.5 text-sm font-medium text-slate-700"
      onBlur={(event) => {
        if (!wrapperRef.current?.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <span>Cabang</span>
      {selectedValues.map((value) => (
        <input key={value} name="branch_ids" value={value} readOnly hidden />
      ))}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          "flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:min-h-10 sm:text-sm",
          selectedBranches.length ? "text-slate-900" : "text-slate-400",
        )}
      >
        <span className="min-w-0">
          {selectedBranches.length
            ? `${selectedBranches.length} cabang dipilih`
            : "Tanpa cabang / semua cabang"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {selectedBranches.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedBranches.map((branch) => (
            <span
              key={branch.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800"
            >
              <span className="truncate">
                {branch.code} - {branch.name}
              </span>
              <button
                type="button"
                onClick={() => removeBranch(branch.id)}
                className="rounded p-0.5 text-teal-700 hover:bg-teal-100"
                aria-label={`Hapus cabang ${branch.name}`}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari cabang..."
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-9 sm:text-sm"
            />
          </div>
          <div className="max-h-[45vh] overflow-y-auto p-1 sm:max-h-56">
            {filteredBranches.length ? (
              filteredBranches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    toggleBranch(branch.id);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-base text-slate-700 hover:bg-slate-100 sm:min-h-0 sm:text-sm"
                >
                  <span className="min-w-0 truncate">
                    {branch.code} - {branch.name}
                  </span>
                  {selectedSet.has(branch.id) ? (
                    <Check className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-slate-500">Data tidak ditemukan.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
