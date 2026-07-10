import { Select } from "@/components/ui";

export function StatusSelect() {
  return (
    <Select label="Status" name="status">
      <option value="Aktif">Aktif</option>
      <option value="Nonaktif">Nonaktif</option>
    </Select>
  );
}
