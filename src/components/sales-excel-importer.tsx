"use client";

import readXlsxFile from "read-excel-file/browser";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Branch } from "@/lib/types";

type ImportStatus = "idle" | "reading" | "uploading" | "done" | "error";

const batchSize = 500;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBranchKey(value: unknown) {
  return normalizeValue(value).toLowerCase();
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

export function SalesExcelImporter({ branches }: { branches: Branch[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const branchMap = useMemo(() => {
    const map = new Map<string, string>();
    branches.forEach((branch) => {
      map.set(normalizeBranchKey(branch.code), branch.id);
      map.set(normalizeBranchKey(branch.name), branch.id);
    });
    return map;
  }, [branches]);

  async function handleImport(formData: FormData) {
    const file = formData.get("excel_file");
    if (!(file instanceof File) || file.size === 0) {
      setStatus("error");
      setMessage("File Excel wajib dipilih.");
      return;
    }

    setStatus("reading");
    setMessage("Membaca file Excel...");
    setProgress({ done: 0, total: 0 });

    try {
      const sheets = (await readXlsxFile(file)) as unknown as Array<{ data?: unknown[][] }>;
      const rows = sheets[0]?.data ?? [];
      const [headers, ...dataRows] = rows;
      if (!headers?.length) throw new Error("File Excel tidak memiliki header.");

      const headerMap: Record<string, string> = {
        "id sales": "sales_code",
        cabang: "branch_code",
        "kode cabang": "branch_code",
        "nama cabang": "branch_code",
        "nama sales": "sales_name",
        status: "status",
      };
      const mappedHeaders = headers.map((header) => headerMap[normalizeHeader(header)]);
      const normalizedRows = dataRows
        .map((row) => {
          const item: Record<string, string> = {};
          row.forEach((value, index) => {
            const mapped = mappedHeaders[index];
            if (mapped) item[mapped] = normalizeValue(value);
          });
          return item;
        })
        .filter((row) => Object.values(row).some(Boolean));

      if (!normalizedRows.length) throw new Error("Tidak ada data sales yang bisa diimport.");

      const missingBranches = Array.from(
        new Set(
          normalizedRows
            .map((row) => row.branch_code)
            .filter((code) => code && !branchMap.has(normalizeBranchKey(code))),
        ),
      );
      if (missingBranches.length) {
        throw new Error(`Cabang tidak ditemukan: ${missingBranches.join(", ")}`);
      }

      const parsed = normalizedRows.map((row, index) => {
        if (!row.sales_code) throw new Error(`ID Sales kosong pada baris ${index + 2}.`);
        if (!row.branch_code) throw new Error(`Cabang kosong pada baris ${index + 2}.`);
        if (!row.sales_name) throw new Error(`Nama Sales kosong pada baris ${index + 2}.`);
        const statusValue = row.status || "Aktif";
        if (!["Aktif", "Nonaktif"].includes(statusValue)) {
          throw new Error(`Status tidak valid pada baris ${index + 2}: ${statusValue}`);
        }

        return {
          sales_code: row.sales_code,
          branch_id: branchMap.get(normalizeBranchKey(row.branch_code))!,
          sales_name: row.sales_name,
          status: statusValue,
        };
      });

      const supabase = createClient();
      const chunks = chunkRows(parsed, batchSize);

      setStatus("uploading");
      setMessage("Mengupload data sales ke Supabase...");
      setProgress({ done: 0, total: parsed.length });

      let imported = 0;
      for (const chunk of chunks) {
        const { error } = await supabase.from("data_sales").upsert(chunk, {
          onConflict: "sales_code",
        });
        if (error) throw new Error(error.message);
        imported += chunk.length;
        setProgress({ done: imported, total: parsed.length });
      }

      setStatus("done");
      setMessage(`${parsed.length.toLocaleString("id-ID")} data sales berhasil diimport.`);
      router.refresh();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Import gagal.");
    }
  }

  const percentage =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <a
        href="/templates/template-data-sales.xlsx"
        className="text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        Download template Excel
      </a>
      <form action={handleImport} className="mt-4 grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          File Excel
          <input
            name="excel_file"
            type="file"
            accept=".xlsx"
            disabled={status === "reading" || status === "uploading"}
            className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white disabled:opacity-60 sm:text-sm"
          />
        </label>
        <button
          disabled={status === "reading" || status === "uploading"}
          className="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:h-10"
        >
          {status === "reading" || status === "uploading" ? "Memproses..." : "Import Excel"}
        </button>
      </form>
      {message ? (
        <div
          className={
            status === "error"
              ? "mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              : "mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
          }
        >
          <p>{message}</p>
          {progress.total > 0 ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-teal-700 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {progress.done.toLocaleString("id-ID")} /{" "}
                {progress.total.toLocaleString("id-ID")} data ({percentage}%)
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
