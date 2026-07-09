"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canViewAllBranches } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { uploadAttachment } from "@/lib/storage";
import {
  customerBaruSchema,
  pemenuhanPoSchema,
  penagihanSchema,
} from "@/lib/validators";

function allowedBranch(profileBranchId: string | null, requestedBranchId: string, canAll: boolean) {
  return canAll || (!!profileBranchId && profileBranchId === requestedBranchId);
}

export async function createCustomerBaru(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = customerBaruSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const confirmation = await uploadAttachment(
    formData.get("confirmation_file") as File | null,
    "customer-baru",
  );

  const { error } = await supabase.from("customer_baru_reports").insert({
    ...parsed,
    confirmation_file: confirmation,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/customer-baru");
  redirect("/customer-baru?created=1");
}

export async function createPemenuhanPo(formData: FormData) {
  const profile = await requireProfile();
  const parsed = pemenuhanPoSchema.parse(Object.fromEntries(formData));
  if (!allowedBranch(profile.branch_id, parsed.branch_id, canViewAllBranches(profile))) {
    throw new Error("Anda hanya bisa input data cabang sendiri.");
  }

  const supabase = await createClient();
  const poFile = await uploadAttachment(formData.get("po_file") as File | null, "pemenuhan-po/po");
  const confirmation = await uploadAttachment(
    formData.get("confirmation_file") as File | null,
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

export async function createPenagihan(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = penagihanSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const proof = await uploadAttachment(formData.get("proof_file") as File | null, "penagihan");

  const { error } = await supabase.from("penagihan_reports").insert({
    ...parsed,
    proof_file: proof,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/penagihan");
  redirect("/penagihan?created=1");
}
