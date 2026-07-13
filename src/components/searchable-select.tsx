"use client";

import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { clsx } from "clsx";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

export function SearchableSelect({
  label,
  name,
  options,
  placeholder = "Pilih data",
  required = true,
  defaultValue = "",
  value,
  onChange,
}: {
  label: string;
  name?: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedValue = value ?? internalValue;
  const selected = options.find((option) => option.value === selectedValue);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      `${option.label} ${option.searchText ?? ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  function choose(nextValue: string) {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
    setQuery("");
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
      <span>{label}</span>
      {name ? <input name={name} value={selectedValue} readOnly hidden required={required} /> : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          "flex h-11 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 text-left text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm",
          selected ? "text-slate-900" : "text-slate-400",
        )}
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="relative border-b border-slate-100 p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari..."
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-9 sm:text-sm"
            />
          </div>
          <div className="max-h-[45vh] overflow-y-auto p-1 sm:max-h-56">
            {!required ? (
              <button
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  choose("");
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-base text-slate-700 hover:bg-slate-100 sm:min-h-0 sm:text-sm"
              >
                <span>{placeholder}</span>
                {!selectedValue ? <Check className="h-4 w-4 text-teal-700" aria-hidden /> : null}
              </button>
            ) : null}
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    choose(option.value);
                  }}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-base text-slate-700 hover:bg-slate-100 sm:min-h-0 sm:text-sm"
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.value === selectedValue ? (
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
