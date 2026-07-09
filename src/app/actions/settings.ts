"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { canManageSettings } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { branchSchema, userSchema } from "@/lib/validators";

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

export async function createUser(formData: FormData) {
  await requireSuperUser();
  const parsed = userSchema.parse(Object.fromEntries(formData));
  const admin = createAdminClient();

  if (parsed.role === "admin_cabang" && !parsed.branch_id) {
    throw new Error("Admin cabang wajib memiliki cabang.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name },
  });

  if (error || !data.user) throw new Error(error?.message ?? "Gagal membuat user.");

  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    full_name: parsed.full_name,
    email: parsed.email,
    role: parsed.role,
    branch_id: parsed.branch_id || null,
  });

  if (profileError) throw new Error(profileError.message);
  revalidatePath("/settings/users");
  redirect("/settings/users?created=1");
}
