import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, role, branch_id, branches(id, code, name), profile_branches(branch_id, branches(id, code, name))",
    )
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  const profile = data as unknown as Profile & {
    profile_branches?: Array<{ branch_id: string; branches: Profile["branches"] }>;
  };

  const branchIds = profile.profile_branches?.map((item) => item.branch_id) ?? [];

  const assignedBranches =
    profile.profile_branches
      ?.map((item) => item.branches)
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
