import { canViewAllBranches } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Profile, ReportRow } from "@/lib/types";

export async function getBranches() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, code, name")
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as Branch[];
}

export async function getReports(table: string, profile: Profile) {
  const supabase = await createClient();
  let query = supabase
    .from(table)
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!canViewAllBranches(profile) && profile.branch_id) {
    query = query.eq("branch_id", profile.branch_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportRow[];
}
