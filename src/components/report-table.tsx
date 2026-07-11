import { SearchableTable, type SearchableColumn } from "@/components/searchable-table";
import type { ReportRow } from "@/lib/types";

export function ReportTable({
  rows,
  columns,
  editHrefBase,
  deleteAction,
}: {
  rows: ReportRow[];
  columns: Array<{ key: string; label: string }>;
  editHrefBase?: string;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const tableColumns: SearchableColumn[] = [
    { key: "branch", label: "Cabang", filterable: true, strong: true },
    ...columns,
    { key: "created_by_name", label: "Input Oleh", filterable: true },
    { key: "created_at_label", label: "Tanggal Input" },
  ];

  const tableRows = rows.map((row) => ({
    id: row.id,
    editHref: editHrefBase ? `${editHrefBase}?edit=${row.id}` : undefined,
    deleteLabel: `data ${row.branches?.code ?? "laporan"} ini`,
    cells: {
      branch: row.branches?.code ?? "-",
      ...Object.fromEntries(columns.map((column) => [column.key, String(row[column.key] ?? "-")])),
      created_by_name: row.profiles?.full_name ?? "-",
      created_at_label: new Date(row.created_at).toLocaleString("id-ID"),
    },
  }));

  return (
    <SearchableTable
      rows={tableRows}
      columns={tableColumns}
      emptyLabel="Belum ada data laporan."
      deleteAction={deleteAction}
    />
  );
}
