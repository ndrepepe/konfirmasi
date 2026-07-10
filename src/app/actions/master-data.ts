"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { readExcelRows } from "@/lib/excel-import";
import { createClient } from "@/lib/supabase/server";
import { customerDataSchema, salesSchema } from "@/lib/validators";

const importBatchSize = 500;

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function requireMasterAccess() {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");
  return profile;
}

export async function createSales(formData: FormData) {
  await requireMasterAccess();
  const parsed = salesSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("data_sales").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/data-sales");
  redirect("/data-sales?created=1");
}

export async function importSales(formData: FormData) {
  await requireMasterAccess();
  const rows = await readExcelRows(formData.get("excel_file") as File | null, {
    "id sales": "sales_code",
    "nama sales": "sales_name",
    status: "status",
  });

  const parsed = rows.map((row) =>
    salesSchema.parse({
      sales_code: row.sales_code,
      sales_name: row.sales_name,
      status: row.status || "Aktif",
    }),
  );

  if (!parsed.length) throw new Error("Tidak ada data sales yang bisa diimport.");

  const supabase = await createClient();
  for (const chunk of chunkRows(parsed, importBatchSize)) {
    const { error } = await supabase.from("data_sales").upsert(chunk, {
      onConflict: "sales_code",
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/data-sales");
  redirect("/data-sales?imported=1");
}

export async function createCustomerData(formData: FormData) {
  await requireMasterAccess();
  const parsed = customerDataSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();

  const { error } = await supabase.from("data_customers").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/data-customer");
  redirect("/data-customer?created=1");
}

export async function importCustomerData(formData: FormData) {
  await requireMasterAccess();
  const rows = await readExcelRows(formData.get("excel_file") as File | null, {
    "id customer": "customer_code",
    "kode cabang": "branch_code",
    "nama customer": "customer_name",
    status: "status",
  });

  if (!rows.length) throw new Error("Tidak ada data customer yang bisa diimport.");

  const branchCodes = Array.from(new Set(rows.map((row) => row.branch_code).filter(Boolean)));
  const supabase = await createClient();
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, code")
    .in("code", branchCodes);
  if (branchError) throw new Error(branchError.message);

  const branchMap = new Map((branches ?? []).map((branch) => [branch.code, branch.id]));
  const missing = branchCodes.filter((code) => !branchMap.has(code));
  if (missing.length) throw new Error(`Kode cabang tidak ditemukan: ${missing.join(", ")}`);

  const parsed = rows.map((row) =>
    customerDataSchema.parse({
      customer_code: row.customer_code,
      branch_id: branchMap.get(row.branch_code),
      customer_name: row.customer_name,
      status: row.status || "Aktif",
    }),
  );

  for (const chunk of chunkRows(parsed, importBatchSize)) {
    const { error } = await supabase.from("data_customers").upsert(chunk, {
      onConflict: "customer_code",
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/data-customer");
  redirect("/data-customer?imported=1");
}
