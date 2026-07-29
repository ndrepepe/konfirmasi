import { SearchableTable, type SearchableColumn } from "@/components/searchable-table";
import { formatDateTimeWib } from "@/lib/date-time";
import type { ReportRow } from "@/lib/types";

export function ReportTable({
  rows,
  columns,
  editHrefBase,
  viewHrefBase,
  viewOwnerId,
  deleteAction,
}: {
  rows: ReportRow[];
  columns: Array<{ key: string; label: string; format?: (value: unknown) => string }>;
  editHrefBase?: string;
  viewHrefBase?: string;
  viewOwnerId?: string;
  deleteAction?: (formData: FormData) => void | Promise<void>;
}) {
  const tableColumns: SearchableColumn[] = [
    { key: "branch", label: "Cabang", filterable: true, strong: true },
    ...columns.map(({ key, label }) => ({ key, label })),
    { key: "created_by_name", label: "Input Oleh", filterable: true },
    { key: "created_at_label", label: "Tanggal Input" },
  ];

  const tableRows = rows.map((row) => ({
    id: row.id,
    editHref: editHrefBase ? `${editHrefBase}?view=input&edit=${row.id}` : undefined,
    viewHref:
      viewHrefBase && (!viewOwnerId || row.created_by === viewOwnerId)
        ? `${viewHrefBase}/${row.id}`
        : undefined,
    deleteLabel: `data ${row.branches?.code ?? "laporan"} ini`,
    cells: {
      branch: row.branches?.name ?? row.branches?.code ?? "-",
      ...Object.fromEntries(
        columns.map((column) => [
          column.key,
          column.format ? column.format(row[column.key]) : String(row[column.key] ?? "-"),
        ]),
      ),
      created_by_name: row.profiles?.full_name ?? "-",
      created_at_label: `${formatDateTimeWib(row.created_at)} WIB`,
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
