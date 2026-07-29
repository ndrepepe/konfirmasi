"use server";

import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@/lib/config";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/database/admin";
import { createClient } from "@/lib/database/server";

export async function signIn(formData: FormData) {
  if (!isDatabaseConfigured()) {
    redirect(
      `/login?error=${encodeURIComponent("Login belum tersedia. Hubungi administrator aplikasi.")}`,
    );
  }

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal login.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function redirectWithPasswordMessage(type: "error" | "success", message: string): never {
  const params = new URLSearchParams({ [type]: message });
  redirect(`/change-password?${params.toString()}`);
}

export async function changePassword(formData: FormData) {
  const profile = await requireProfile();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");
  const requestedUserId = String(formData.get("user_id") ?? "");

  if (password.length < 8) {
    redirectWithPasswordMessage("error", "Password minimal 8 karakter.");
  }

  if (password !== confirmPassword) {
    redirectWithPasswordMessage("error", "Konfirmasi password tidak sama.");
  }

  if (profile.role === "super_user") {
    const targetUserId = requestedUserId || profile.id;
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(targetUserId, { password });
    if (error) redirectWithPasswordMessage("error", error.message);
    redirectWithPasswordMessage("success", "Password user berhasil diubah.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirectWithPasswordMessage("error", error.message);

  redirectWithPasswordMessage("success", "Password berhasil diubah.");
}
