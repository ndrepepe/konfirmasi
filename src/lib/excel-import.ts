import readXlsxFile from "read-excel-file/node";

export type ExcelRow = Record<string, string>;

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeValue(value: unknown) {
  return String(value ?? "").trim();
}

export async function readExcelRows(file: File | null, headerMap: Record<string, string>) {
  if (!file || file.size === 0) throw new Error("File Excel wajib dipilih.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const sheets = (await readXlsxFile(buffer)) as unknown as Array<{
    data?: unknown[][];
  }>;
  const rawRows = sheets[0]?.data ?? [];
  const [headers, ...dataRows] = rawRows;
  if (!headers?.length) throw new Error("File Excel tidak memiliki header.");

  const mappedHeaders = headers.map((header) => headerMap[normalizeHeader(header)]);

  return dataRows
    .map((row) => {
      const normalized: ExcelRow = {};
      row.forEach((value, index) => {
        const mapped = mappedHeaders[index];
        if (mapped) normalized[mapped] = normalizeValue(value);
      });
      return normalized;
    })
    .filter((row) => Object.values(row).some(Boolean));
}
