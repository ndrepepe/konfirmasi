import { SearchableSelect } from "@/components/searchable-select";

export function StatusSelect({ defaultValue = "Aktif" }: { defaultValue?: string }) {
  return (
    <SearchableSelect
      label="Status"
      name="status"
      defaultValue={defaultValue}
      options={[
        { value: "Aktif", label: "Aktif" },
        { value: "Nonaktif", label: "Nonaktif" },
      ]}
    />
  );
}
