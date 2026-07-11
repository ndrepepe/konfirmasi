"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { readExcelRows } from "@/lib/excel-import";
import { canManageSettings } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, userSchema, userUpdateSchema } from "@/lib/validators";

function redirectWithSettingsError(message: string): never {
  const params = new URLSearchParams({ error: message });
  redirect(`/settings/users?${params.toString()}`);
}

async function requireSuperUser() {
  const profile = await requireProfile();
  if (!canManageSettings(profile)) redirect("/dashboard");
  return profile;
}

export async function createBranch(formData: FormData) {
  await requireSuperUser();
  const parsed = branchSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert(parsed);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/branches");
  redirect("/settings/branches?created=1");
}

export async function updateBranch(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID cabang tidak ditemukan.");
  const parsed = branchSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("branches").update(parsed).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/branches");
  redirect("/settings/branches?updated=1");
}

export async function deleteBranch(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID cabang tidak ditemukan.");
  const supabase = await createClient();

  const { error } = await supabase.from("branches").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/branches");
  redirect("/settings/branches?deleted=1");
}

export async function importBranches(formData: FormData) {
  await requireSuperUser();
  const rows = await readExcelRows(formData.get("excel_file") as File | null, {
    "kode cabang": "code",
    "nama cabang": "name",
  });

  const parsed = rows.map((row) =>
    branchSchema.parse({
      code: row.code,
      name: row.name,
    }),
  );

  if (!parsed.length) throw new Error("Tidak ada data cabang yang bisa diimport.");

  const supabase = await createClient();
  const { error } = await supabase.from("branches").upsert(parsed, {
    onConflict: "code",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/settings/branches");
  redirect("/settings/branches?imported=1");
}

export async function createUser(formData: FormData) {
  await requireSuperUser();
  const parsedResult = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsedResult.success) {
    redirectWithSettingsError(parsedResult.error.issues[0]?.message ?? "Data user tidak valid.");
  }

  const parsed = parsedResult.data;
  if (parsed.role === "admin_cabang" && !parsed.branch_id) {
    redirectWithSettingsError("Admin cabang wajib memiliki cabang.");
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (error) {
    redirectWithSettingsError(error instanceof Error ? error.message : "Gagal membuat user.");
  }

  let userId = "";
  let createErrorMessage = "";
  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.full_name },
    });

    if (error || !data.user) {
      createErrorMessage = error?.message?.toLowerCase().includes("already")
        ? "Email user sudah terdaftar."
        : (error?.message ?? "Gagal membuat user.");
    } else {
      userId = data.user.id;
    }
  } catch (error) {
    createErrorMessage = error instanceof Error ? error.message : "Gagal membuat user.";
  }
  if (createErrorMessage) redirectWithSettingsError(createErrorMessage);
  if (!userId) redirectWithSettingsError("Gagal membuat user.");

  let profileErrorMessage = "";
  try {
    const { error: profileError } = await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: parsed.full_name,
        email: parsed.email,
        role: parsed.role,
        branch_id: parsed.branch_id || null,
      },
      { onConflict: "id" },
    );

    if (profileError) profileErrorMessage = profileError.message;
  } catch (error) {
    profileErrorMessage = error instanceof Error ? error.message : "Gagal membuat user.";
  }
  if (profileErrorMessage) redirectWithSettingsError(profileErrorMessage);

  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}

export async function updateUser(formData: FormData) {
  await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID user tidak ditemukan.");
  const parsed = userUpdateSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();

  if (parsed.role === "admin_cabang" && !parsed.branch_id) {
    throw new Error("Admin cabang wajib memiliki cabang.");
  }

  const { error: authError } = await admin.auth.admin.updateUserById(id, {
    email: parsed.email,
    user_metadata: { full_name: parsed.full_name },
  });
  if (authError) throw new Error(authError.message);

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.full_name,
      email: parsed.email,
      role: parsed.role,
      branch_id: parsed.branch_id || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  redirect("/settings/users?updated=1");
}

export async function deleteUser(formData: FormData) {
  const profile = await requireSuperUser();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("ID user tidak ditemukan.");
  if (id === profile.id) throw new Error("User yang sedang login tidak bisa dihapus.");

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) throw new Error(authError.message);

  const { error } = await admin.from("profiles").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/users");
  redirect("/settings/users?deleted=1");
}
