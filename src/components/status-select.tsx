import { SearchableSelect } from "@/components/searchable-select";

export function StatusSelect() {
  return (
    <SearchableSelect
      label="Status"
      name="status"
      defaultValue="Aktif"
      options={[
        { value: "Aktif", label: "Aktif" },
        { value: "Nonaktif", label: "Nonaktif" },
      ]}
    />
  );
}
