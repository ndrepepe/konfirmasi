"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { readExcelRows } from "@/lib/excel-import";
import {
  canUseConfiguredBranch,
  canViewAllBranches,
  getAssignedBranchIds,
} from "@/lib/permissions";
import { createClient } from "@/lib/database/server";
import { customerDataSchema, salesSchema } from "@/lib/validators";

const importBatchSize = 2000;

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function normalizeBranchKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function redirectWithMasterError(path: "/data-sales" | "/data-customer", message: string): never {
  const params = new URLSearchParams({ view: "input", error: message });
  redirect(`${path}?${params.toString()}`);
}

function missingBranchesMessage(missing: string[]) {
  const visible = missing.slice(0, 20);
  const suffix = missing.length > visible.length ? `, dan ${missing.length - visible.length} cabang lain` : "";
  return `Cabang tidak ditemukan: ${visible.join(", ")}${suffix}. Input/import Data Cabang terlebih dahulu.`;
}

async function requireMasterAccess() {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");
  return profile;
}

async function requireSuperUser() {
  const profile = await requireProfile();
  if (profile.role !== "super_user") redirect("/dashboard");
  return profile;
}

export async function createSales(formData: FormData) {
  const profile = await requireMasterAccess();
  const parsed = salesSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa input data cabang yang diset untuk user Anda.");
  }
  const supabase = await createClient();

  const { error } = await supabase.from("data_sales").insert(parsed);
  if (error) throw new Error(error.message);

  revalidateTag("data-sales", "max");
  revalidatePath("/data-sales");
  redirect("/data-sales?view=data&created=1");
}

export async function updateSales(formData: FormData) {
  const profile = await requireMasterAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID data sales tidak ditemukan.");
  const parsed = salesSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang yang diset untuk user Anda.");
  }
  const supabase = await createClient();

  let query = supabase.from("data_sales").update(parsed).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.in("branch_id", branchIds);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidateTag("data-sales", "max");
  revalidatePath("/data-sales");
  redirect("/data-sales?view=data&updated=1");
}

export async function deleteSales(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID data sales tidak ditemukan.");
  const supabase = await createClient();

  const { error } = await supabase.from("data_sales").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateTag("data-sales", "max");
  revalidatePath("/data-sales");
  redirect("/data-sales?view=data&deleted=1");
}

export async function importSales(formData: FormData) {
  const profile = await requireMasterAccess();
  let rows: Awaited<ReturnType<typeof readExcelRows>>;
  try {
    rows = await readExcelRows(formData.get("excel_file") as File | null, {
      "id sales": "sales_code",
      cabang: "branch_code",
      "kode cabang": "branch_code",
      "nama cabang": "branch_code",
      "nama sales": "sales_name",
      status: "status",
    });
  } catch (error) {
    redirectWithMasterError("/data-sales", error instanceof Error ? error.message : "Gagal membaca file Excel.");
  }

  if (!rows.length) redirectWithMasterError("/data-sales", "Tidak ada data sales yang bisa diimport.");

  const branchCodes = Array.from(new Set(rows.map((row) => row.branch_code).filter(Boolean)));
  const supabase = await createClient();
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, code, name");
  if (branchError) redirectWithMasterError("/data-sales", branchError.message);

  const assignedBranchIds = getAssignedBranchIds(profile);
  const accessibleBranches = canViewAllBranches(profile)
    ? (branches ?? [])
    : (branches ?? []).filter((branch: { id: string }) => assignedBranchIds.includes(branch.id));
  const branchMap = new Map<string, string>();
  accessibleBranches.forEach((branch: { id: string; code: string; name: string }) => {
    branchMap.set(normalizeBranchKey(branch.code), branch.id);
    branchMap.set(normalizeBranchKey(branch.name), branch.id);
  });

  const missing = branchCodes.filter((code) => !branchMap.has(normalizeBranchKey(code)));
  if (missing.length) redirectWithMasterError("/data-sales", missingBranchesMessage(missing));

  const parsedResult = salesSchema.array().safeParse(
    rows.map((row) => ({
      sales_code: row.sales_code,
      branch_id: branchMap.get(normalizeBranchKey(row.branch_code)),
      sales_name: row.sales_name,
      status: row.status || "Aktif",
    })),
  );
  if (!parsedResult.success) {
    redirectWithMasterError(
      "/data-sales",
      parsedResult.error.issues[0]?.message ?? "Format data Sales di Excel tidak valid.",
    );
  }

  for (const chunk of chunkRows(parsedResult.data, importBatchSize)) {
    if (!canViewAllBranches(profile)) {
      const { data: existing, error: existingError } = await supabase
        .from("data_sales")
        .select("sales_code, branch_id")
        .in("sales_code", chunk.map((row) => row.sales_code));
      if (existingError) redirectWithMasterError("/data-sales", existingError.message);
      const forbidden = (existing ?? []).find(
        (row: { sales_code: string; branch_id: string }) =>
          !assignedBranchIds.includes(row.branch_id),
      );
      if (forbidden) {
        redirectWithMasterError(
          "/data-sales",
          `ID Sales ${forbidden.sales_code} berada di cabang yang tidak ditugaskan kepada user Anda.`,
        );
      }
    }
    const { error } = await supabase.from("data_sales").upsert(chunk, {
      onConflict: "sales_code",
    });
    if (error) redirectWithMasterError("/data-sales", error.message);
  }

  revalidateTag("data-sales", "max");
  revalidatePath("/data-sales");
  redirect("/data-sales?view=data&imported=1");
}

export async function createCustomerData(formData: FormData) {
  const profile = await requireMasterAccess();
  const parsed = customerDataSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa input data cabang yang diset untuk user Anda.");
  }
  const supabase = await createClient();

  const { error } = await supabase.from("data_customers").insert(parsed);
  if (error) throw new Error(error.message);

  revalidatePath("/data-customer");
  redirect("/data-customer?view=data&created=1");
}

export async function updateCustomerData(formData: FormData) {
  const profile = await requireMasterAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID data customer tidak ditemukan.");
  const parsed = customerDataSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang yang diset untuk user Anda.");
  }
  const supabase = await createClient();

  let query = supabase.from("data_customers").update(parsed).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.in("branch_id", branchIds);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/data-customer");
  redirect("/data-customer?view=data&updated=1");
}

export async function deleteCustomerData(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID data customer tidak ditemukan.");
  const supabase = await createClient();

  const { error } = await supabase.from("data_customers").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/data-customer");
  redirect("/data-customer?view=data&deleted=1");
}

export async function importCustomerData(formData: FormData) {
  const profile = await requireMasterAccess();
  let rows: Awaited<ReturnType<typeof readExcelRows>>;
  try {
    rows = await readExcelRows(formData.get("excel_file") as File | null, {
      "id customer": "customer_code",
      cabang: "branch_code",
      "kode cabang": "branch_code",
      "nama cabang": "branch_code",
      "nama customer": "customer_name",
      status: "status",
    });
  } catch (error) {
    redirectWithMasterError("/data-customer", error instanceof Error ? error.message : "Gagal membaca file Excel.");
  }

  if (!rows.length) redirectWithMasterError("/data-customer", "Tidak ada data customer yang bisa diimport.");

  const branchCodes = Array.from(new Set(rows.map((row) => row.branch_code).filter(Boolean)));
  const supabase = await createClient();
  const { data: branches, error: branchError } = await supabase
    .from("branches")
    .select("id, code, name");
  if (branchError) redirectWithMasterError("/data-customer", branchError.message);

  const assignedBranchIds = getAssignedBranchIds(profile);
  const accessibleBranches = canViewAllBranches(profile)
    ? (branches ?? [])
    : (branches ?? []).filter((branch: { id: string }) => assignedBranchIds.includes(branch.id));
  const branchMap = new Map<string, string>();
  accessibleBranches.forEach((branch: { id: string; code: string; name: string }) => {
    branchMap.set(normalizeBranchKey(branch.code), branch.id);
    branchMap.set(normalizeBranchKey(branch.name), branch.id);
  });

  const missing = branchCodes.filter((code) => !branchMap.has(normalizeBranchKey(code)));
  if (missing.length) redirectWithMasterError("/data-customer", missingBranchesMessage(missing));

  const parsedResult = customerDataSchema.array().safeParse(
    rows.map((row) => ({
      customer_code: row.customer_code,
      branch_id: branchMap.get(normalizeBranchKey(row.branch_code)),
      customer_name: row.customer_name,
      status: row.status || "Aktif",
    })),
  );
  if (!parsedResult.success) {
    redirectWithMasterError(
      "/data-customer",
      parsedResult.error.issues[0]?.message ?? "Format data Customer di Excel tidak valid.",
    );
  }

  for (const chunk of chunkRows(parsedResult.data, importBatchSize)) {
    if (!canViewAllBranches(profile)) {
      const { data: existing, error: existingError } = await supabase
        .from("data_customers")
        .select("customer_code, branch_id")
        .in("customer_code", chunk.map((row) => row.customer_code));
      if (existingError) redirectWithMasterError("/data-customer", existingError.message);
      const forbidden = (existing ?? []).find(
        (row: { customer_code: string; branch_id: string }) =>
          !assignedBranchIds.includes(row.branch_id),
      );
      if (forbidden) {
        redirectWithMasterError(
          "/data-customer",
          `ID Customer ${forbidden.customer_code} berada di cabang yang tidak ditugaskan kepada user Anda.`,
        );
      }
    }
    const { error } = await supabase.from("data_customers").upsert(chunk, {
      onConflict: "customer_code",
    });
    if (error) redirectWithMasterError("/data-customer", error.message);
  }

  revalidatePath("/data-customer");
  redirect("/data-customer?view=data&imported=1");
}
