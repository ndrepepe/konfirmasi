import { EmptyState } from "@/components/ui";
import type { ReportRow } from "@/lib/types";

export function ReportTable({
  rows,
  columns,
}: {
  rows: ReportRow[];
  columns: Array<{ key: string; label: string }>;
}) {
  if (!rows.length) return <EmptyState label="Belum ada data laporan." />;

  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Cabang</th>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3">
                {column.label}
              </th>
            ))}
            <th className="px-4 py-3">Input Oleh</th>
            <th className="px-4 py-3">Tanggal Input</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {row.branches?.code ?? "-"}
              </td>
              {columns.map((column) => (
                <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                  {String(row[column.key] ?? "-")}
                </td>
              ))}
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                {row.profiles?.full_name ?? "-"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {new Date(row.created_at).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
