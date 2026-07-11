import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, full_name, email, role, branch_id, branches(id, code, name)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  const profile = data as unknown as Profile;
  const { data: profileBranches } = await admin
    .from("profile_branches")
    .select("branch_id")
    .eq("profile_id", user.id);

  const branchIds = profileBranches?.map((item) => item.branch_id) ?? [];

  return {
    ...profile,
    branch_ids: branchIds.length ? branchIds : profile.branch_id ? [profile.branch_id] : [],
    assigned_branches: profile.branches ? [profile.branches] : [],
  };
});

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
