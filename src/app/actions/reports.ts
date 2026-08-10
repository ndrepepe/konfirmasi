"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import {
  canAccessBranch,
  canUseConfiguredBranch,
  canViewAllBranches,
  getAssignedBranchIds,
} from "@/lib/permissions";
import { createAdminClient } from "@/lib/database/admin";
import { createClient } from "@/lib/database/server";
import {
  deleteStoredAttachments,
  parseStoredAttachments,
  type StoredAttachment,
  uploadAttachments,
} from "@/lib/storage";
import type { Profile } from "@/lib/types";
import {
  customerBaruSchema,
  pemenuhanPoSchema,
  penagihanSchema,
} from "@/lib/validators";

function filesFromForm(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is File => value instanceof File);
}

function attachmentChanges(
  currentValue: unknown,
  formData: FormData,
  fieldName: string,
  uploaded: StoredAttachment[],
) {
  const current = parseStoredAttachments(currentValue);
  const removedKeys = new Set(
    formData.getAll(`${fieldName}_remove`).map((value) => String(value)),
  );
  const removed = current.filter((file) => removedKeys.has(file.key));
  const retained = current.filter((file) => !removedKeys.has(file.key));

  return {
    next: [...retained, ...uploaded],
    removed,
  };
}

async function cleanupUploaded(files: StoredAttachment[]) {
  await deleteStoredAttachments(files).catch(() => undefined);
}

async function getEditableReport(profile: Profile, table: string, id: string) {
  const admin = createAdminClient();
  let query = admin.from(table).select("*").eq("id", id);

  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.eq("created_by", profile.id).in("branch_id", branchIds);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Data tidak ditemukan atau tidak dapat diedit.");

  return {
    admin,
    row: data as Record<string, unknown>,
  };
}

type DeleteAttachmentOptions = {
  table: string;
  allowedFields: string[];
  forbiddenRole?: Profile["role"];
};

export type DeleteAttachmentResult = {
  success: boolean;
  message: string;
};

async function deleteReportAttachment(
  formData: FormData,
  options: DeleteAttachmentOptions,
): Promise<DeleteAttachmentResult> {
  try {
    const profile = await requireProfile();
    if (profile.role === options.forbiddenRole) {
      return { success: false, message: "Anda tidak memiliki akses menghapus lampiran ini." };
    }

    const id = String(formData.get("report_id") ?? "");
    const fieldName = String(formData.get("field_name") ?? "");
    const key = String(formData.get("key") ?? "");
    if (!id || !key || !options.allowedFields.includes(fieldName)) {
      return { success: false, message: "Data lampiran tidak valid." };
    }

    const { admin, row } = await getEditableReport(profile, options.table, id);
    const current = parseStoredAttachments(row[fieldName]);
    const target = current.find((file) => file.key === key);
    if (!target) {
      return { success: false, message: "Lampiran tidak ditemukan pada laporan." };
    }

    let query = admin
      .from(options.table)
      .update({ [fieldName]: current.filter((file) => file.key !== key) })
      .eq("id", id);
    if (!canViewAllBranches(profile)) {
      const branchIds = getAssignedBranchIds(profile);
      if (!branchIds.length) {
        return { success: false, message: "User belum memiliki akses cabang." };
      }
      query = query.eq("created_by", profile.id).in("branch_id", branchIds);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data) || !data.length) {
      return {
        success: false,
        message: error?.message ?? "Data tidak ditemukan atau tidak dapat diedit.",
      };
    }

    try {
      await deleteStoredAttachments([target]);
      return { success: true, message: "Lampiran berhasil dihapus." };
    } catch {
      return {
        success: true,
        message: "Lampiran dihapus dari laporan, tetapi file storage perlu dibersihkan.",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghapus lampiran.",
    };
  }
}

export async function deleteCustomerBaruAttachment(formData: FormData) {
  return deleteReportAttachment(formData, {
    table: "customer_baru_reports",
    allowedFields: ["confirmation_file"],
    forbiddenRole: "admin_cabang",
  });
}

export async function deletePemenuhanPoAttachment(formData: FormData) {
  return deleteReportAttachment(formData, {
    table: "pemenuhan_po_reports",
    allowedFields: ["po_file", "confirmation_file"],
    forbiddenRole: "accounting",
  });
}

export async function deletePenagihanAttachment(formData: FormData) {
  return deleteReportAttachment(formData, {
    table: "penagihan_reports",
    allowedFields: ["proof_file"],
    forbiddenRole: "admin_cabang",
  });
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
  redirect(`${path}?view=data&deleted=1`);
}

export async function createCustomerBaru(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = customerBaruSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa input data cabang yang diset untuk user Anda.");
  }
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
  redirect("/customer-baru?view=data&created=1");
}

export async function updateCustomerBaru(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan customer baru tidak ditemukan.");
  const parsed = customerBaruSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang yang diset untuk user Anda.");
  }
  const { admin, row } = await getEditableReport(
    profile,
    "customer_baru_reports",
    id,
  );

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

  const confirmation = await uploadAttachments(
    filesFromForm(formData, "confirmation_file"),
    "customer-baru",
  );
  const confirmationChanges = attachmentChanges(
    row.confirmation_file,
    formData,
    "confirmation_file",
    confirmation,
  );
  const updatePayload: Record<string, unknown> = {
    ...parsed,
    confirmation_file: confirmationChanges.next,
  };

  let query = admin.from("customer_baru_reports").update(updatePayload).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.eq("created_by", profile.id).in("branch_id", branchIds);
  }
  const { data, error } = await query;
  if (error || !Array.isArray(data) || !data.length) {
    await cleanupUploaded(confirmation);
    throw new Error(error?.message ?? "Data tidak ditemukan atau tidak dapat diedit.");
  }
  await deleteStoredAttachments(confirmationChanges.removed);
  revalidatePath("/customer-baru");
  revalidatePath("/data-customer");
  redirect("/customer-baru?view=data&updated=1");
}

export async function deleteCustomerBaru(formData: FormData) {
  await deleteReportRow(formData, "customer_baru_reports", "/customer-baru");
}

export type CreatePemenuhanPoResult = {
  success: boolean;
  message?: string;
};

export async function createPemenuhanPo(
  formData: FormData,
): Promise<CreatePemenuhanPoResult> {
  const profile = await requireProfile();
  const parsedResult = pemenuhanPoSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    return {
      success: false,
      message: parsedResult.error.issues[0]?.message ?? "Data Konfirmasi PO belum lengkap.",
    };
  }
  const parsed = parsedResult.data;
  if (!canAccessBranch(profile, parsed.branch_id)) {
    return { success: false, message: "Anda hanya bisa input data cabang sendiri." };
  }
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    return {
      success: false,
      message: "Anda hanya bisa input data cabang yang diset untuk user Anda.",
    };
  }

  const supabase = await createClient();
  let poFile: StoredAttachment[] = [];
  let confirmation: StoredAttachment[] = [];
  try {
    poFile = await uploadAttachments(
      filesFromForm(formData, "po_file"),
      "pemenuhan-po/po",
    );
    confirmation = await uploadAttachments(
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
    return { success: true };
  } catch (error) {
    await cleanupUploaded([...poFile, ...confirmation]);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Data Konfirmasi PO gagal disimpan.",
    };
  }
}

export async function updatePemenuhanPo(formData: FormData) {
  const profile = await requireProfile();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan Konfirmasi PO tidak ditemukan.");
  const parsed = pemenuhanPoSchema.parse(Object.fromEntries(formData));
  if (!canAccessBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang sendiri.");
  }
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang yang diset untuk user Anda.");
  }

  const { admin, row } = await getEditableReport(
    profile,
    "pemenuhan_po_reports",
    id,
  );
  let poFile: StoredAttachment[] = [];
  let confirmation: StoredAttachment[] = [];
  try {
    poFile = await uploadAttachments(
      filesFromForm(formData, "po_file"),
      "pemenuhan-po/po",
    );
    confirmation = await uploadAttachments(
      filesFromForm(formData, "confirmation_file"),
      "pemenuhan-po/konfirmasi",
    );
  } catch (error) {
    await cleanupUploaded([...poFile, ...confirmation]);
    throw error;
  }
  const poChanges = attachmentChanges(row.po_file, formData, "po_file", poFile);
  const confirmationChanges = attachmentChanges(
    row.confirmation_file,
    formData,
    "confirmation_file",
    confirmation,
  );
  const updatePayload: Record<string, unknown> = {
    ...parsed,
    po_file: poChanges.next,
    confirmation_file: confirmationChanges.next,
  };

  let query = admin.from("pemenuhan_po_reports").update(updatePayload).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.eq("created_by", profile.id).in("branch_id", branchIds);
  }
  const { data, error } = await query;
  if (error || !Array.isArray(data) || !data.length) {
    await cleanupUploaded([...poFile, ...confirmation]);
    throw new Error(error?.message ?? "Data tidak ditemukan atau tidak dapat diedit.");
  }
  await deleteStoredAttachments([
    ...poChanges.removed,
    ...confirmationChanges.removed,
  ]);
  revalidatePath("/pemenuhan-po");
  redirect("/pemenuhan-po?view=data&updated=1");
}

export async function deletePemenuhanPo(formData: FormData) {
  await deleteReportRow(formData, "pemenuhan_po_reports", "/pemenuhan-po");
}

export async function createPenagihan(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const parsed = penagihanSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa input data cabang yang diset untuk user Anda.");
  }
  const supabase = await createClient();
  const proof = await uploadAttachments(filesFromForm(formData, "proof_file"), "penagihan");

  const { error } = await supabase.from("penagihan_reports").insert({
    ...parsed,
    proof_file: proof,
    created_by: profile.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/penagihan");
  redirect("/penagihan?view=data&created=1");
}

export async function updatePenagihan(formData: FormData) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID laporan penagihan tidak ditemukan.");
  const parsed = penagihanSchema.parse(Object.fromEntries(formData));
  if (!canUseConfiguredBranch(profile, parsed.branch_id)) {
    throw new Error("Anda hanya bisa edit data cabang yang diset untuk user Anda.");
  }
  const { admin, row } = await getEditableReport(
    profile,
    "penagihan_reports",
    id,
  );
  const proof = await uploadAttachments(filesFromForm(formData, "proof_file"), "penagihan");
  const proofChanges = attachmentChanges(row.proof_file, formData, "proof_file", proof);
  const updatePayload: Record<string, unknown> = {
    ...parsed,
    proof_file: proofChanges.next,
  };

  let query = admin.from("penagihan_reports").update(updatePayload).eq("id", id);
  if (!canViewAllBranches(profile)) {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) throw new Error("User belum memiliki akses cabang.");
    query = query.eq("created_by", profile.id).in("branch_id", branchIds);
  }
  const { data, error } = await query;
  if (error || !Array.isArray(data) || !data.length) {
    await cleanupUploaded(proof);
    throw new Error(error?.message ?? "Data tidak ditemukan atau tidak dapat diedit.");
  }
  await deleteStoredAttachments(proofChanges.removed);
  revalidatePath("/penagihan");
  redirect("/penagihan?view=data&updated=1");
}

export async function deletePenagihan(formData: FormData) {
  await deleteReportRow(formData, "penagihan_reports", "/penagihan");
}
