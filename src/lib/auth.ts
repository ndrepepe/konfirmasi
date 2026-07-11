import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Profile } from "@/lib/types";

function normalizeBranch(value: Branch | Branch[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, branch_id, branches(id, code, name)")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  const profile = data as unknown as Profile;
  const { data: profileBranches } = await supabase
    .from("profile_branches")
    .select("branch_id, branches(id, code, name)")
    .eq("profile_id", user.id);

  const branchIds = profileBranches?.map((item) => item.branch_id) ?? [];

  const assignedBranches =
    profileBranches
      ?.map((item) => normalizeBranch(item.branches))
      .filter((branch): branch is NonNullable<Profile["branches"]> => Boolean(branch)) ?? [];

  return {
    ...profile,
    branch_ids: branchIds.length ? branchIds : profile.branch_id ? [profile.branch_id] : [],
    assigned_branches: assignedBranches.length
      ? assignedBranches
      : profile.branches
        ? [profile.branches]
        : [],
  };
});

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
