import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Profile } from "@/lib/types";

type ProfileRow = Omit<Profile, "branches" | "branch_ids" | "assigned_branches">;

async function readProfileRow(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, email, role, branch_id")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as ProfileRow;
}

async function readProfileBranchIds(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await client
    .from("profile_branches")
    .select("branch_id")
    .eq("profile_id", userId);

  if (error) return [];
  return (data ?? []).map((item) => item.branch_id).filter(Boolean);
}

async function readBranch(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  branchId: string | null,
) {
  if (!branchId) return null;
  const { data, error } = await client
    .from("branches")
    .select("id, code, name")
    .eq("id", branchId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Branch;
}

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    let dataClient: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient> =
      supabase;
    try {
      dataClient = createAdminClient();
    } catch {
      dataClient = supabase;
    }

    let profile = await readProfileRow(dataClient, user.id);
    if (!profile && dataClient !== supabase) {
      profile = await readProfileRow(supabase, user.id);
    }
    if (!profile) return null;

    const branchIds = await readProfileBranchIds(dataClient, user.id);
    const assignedBranchIds = branchIds.length
      ? branchIds
      : profile.branch_id
        ? [profile.branch_id]
        : [];
    const primaryBranch = await readBranch(dataClient, profile.branch_id);

    return {
      ...profile,
      branches: primaryBranch,
      branch_ids: assignedBranchIds,
      assigned_branches: primaryBranch ? [primaryBranch] : [],
    };
  } catch {
    return null;
  }
});

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}
