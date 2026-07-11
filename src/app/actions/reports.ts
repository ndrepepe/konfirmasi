"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canAccessBranch, canViewAllBranches, getAssignedBranchIds } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachments } from "@/lib/storage";
import {
  customerBaruSchema,
  pemenuhanPoSchema,
  penagihanSchema,
} from "@/lib/validators";

function filesFromForm(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => value instanceof File);
}

async function requireSuperUser() {
  const profile = await requireProfile();
  if (profile.role !== "super_user") redirect("/dashboard");
  return profile;
}

async function deleteReportRow(formData: FormData, table: string, path: string) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID data tidak ditemukan.");

  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(path);
  redirect(`${path}?deleted=1`);
}

export async function createCustomerBaru(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = customerBaruSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const confirmation = await uploadAttachments(
    filesFromForm(formData, "confirmation_file"),
    "customer-baru",
  );

  const { error: customerError } = await supabase.from("data_customers").upsert(
    {
      customer_code: parsed.customer_id,
      branch_id: parsed.branch_id,
      customer_name: parsed.customer_new,
      status: "Aktif",
    },
    { onConflict: "customer_code" },
  );

  if (customerError) throw new Error(customerError.message);

  const { error } = await supabase.from("customer_baru_reports").insert({
    ...parsed,
    confirmation_file: confirmation,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/customer-baru");
  revalidatePath("/data-customer");
  redirect("/customer-baru?created=1");
}

export async function updateCustomerBaru(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan customer baru tidak ditemukan.");
  const parsed = customerBaruSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const confirmation = await uploadAttachments(
    filesFromForm(formData, "confirmation_file"),
    "customer-baru",
  );

  const updatePayload: Record<string, unknown> = { ...parsed };
  if (confirmation.length) updatePayload.confirmation_file = confirmation;

  const { error: customerError } = await admin.from("data_customers").upsert(
    {
      customer_code: parsed.customer_id,
      branch_id: parsed.branch_id,
      customer_name: parsed.customer_new,
      status: "Aktif",
    },
    { onConflict: "customer_code" },
  );
  if (customerError) throw new Error(customerError.message);

  const { error } = await admin.from("customer_baru_reports").update(updatePayload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customer-baru");
  revalidatePath("/data-customer");
  redirect("/customer-baru?updated=1");
}

export async function deleteCustomerBaru(formData: FormData) {
  await deleteReportRow(formData, "customer_baru_reports", "/customer-baru");
}

export async function createPemenuhanPo(formData: FormData) {
  const profile = await requireProfile();
  const parsed = pemenuhanPoSchema.parse(Object.fromEntries(formData));
  if (!canAccessBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa input data cabang sendiri.");
  }

  const supabase = await createClient();
  const poFile = await uploadAttachments(filesFromForm(formData, "po_file"), "pemenuhan-po/po");
  const confirmation = await uploadAttachments(
    filesFromForm(formData, "confirmation_file"),
    "pemenuhan-po/konfirmasi",
  );

  const { error } = await supabase.from("pemenuhan_po_reports").insert({
    ...parsed,
    po_file: poFile,
    confirmation_file: confirmation,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/pemenuhan-po");
  redirect("/pemenuhan-po?created=1");
}

export async function updatePemenuhanPo(formData: FormData) {
  const profile = await requireProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan pemenuhan PO tidak ditemukan.");
  const parsed = pemenuhanPoSchema.parse(Object.fromEntries(formData));
  if (!canAccessBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang sendiri.");
  }

  const admin = createAdminClient();
  const poFile = await uploadAttachments(filesFromForm(formData, "po_file"), "pemenuhan-po/po");
  const confirmation = await uploadAttachments(
    filesFromForm(formData, "confirmation_file"),
    "pemenuhan-po/konfirmasi",
  );
  const updatePayload: Record<string, unknown> = { ...parsed };
  if (poFile.length) updatePayload.po_file = poFile;
  if (confirmation.length) updatePayload.confirmation_file = confirmation;

  let query = admin.from("pemenuhan_po_reports").update(updatePayload).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.in("branch_id", branchIds);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);
  revalidatePath("/pemenuhan-po");
  redirect("/pemenuhan-po?updated=1");
}

export async function deletePemenuhanPo(formData: FormData) {
  await deleteReportRow(formData, "pemenuhan_po_reports", "/pemenuhan-po");
}

export async function createPenagihan(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = penagihanSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const proof = await uploadAttachments(filesFromForm(formData, "proof_file"), "penagihan");

  const { error } = await supabase.from("penagihan_reports").insert({
    ...parsed,
    proof_file: proof,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/penagihan");
  redirect("/penagihan?created=1");
}

export async function updatePenagihan(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan penagihan tidak ditemukan.");
  const parsed = penagihanSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();
  const proof = await uploadAttachments(filesFromForm(formData, "proof_file"), "penagihan");
  const updatePayload: Record<string, unknown> = { ...parsed };
  if (proof.length) updatePayload.proof_file = proof;

  const { error } = await admin.from("penagihan_reports").update(updatePayload).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/penagihan");
  redirect("/penagihan?updated=1");
}

export async function deletePenagihan(formData: FormData) {
  await deleteReportRow(formData, "penagihan_reports", "/penagihan");
}
