import type { Profile, UserRole } from "@/lib/types";

export const roleLabels: Record<UserRole, string> = {
  super_user: "Super User",
  accounting: "Accounting",
  admin_cabang: "Admin Cabang",
};

export const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "super_user", label: roleLabels.super_user },
  { value: "accounting", label: roleLabels.accounting },
  { value: "admin_cabang", label: roleLabels.admin_cabang },
];

export function canViewInputRecap(profile: Profile) {
  return profile.role === "super_user";
}

export function canAccessMenu(profile: Profile, href: string) {
  if (href === "/change-password") return true;
  if (href === "/rekap-input") return canViewInputRecap(profile);
  if (profile.role === "super_user") return true;
  if (profile.role === "accounting") {
    return href !== "/settings/users" && href !== "/settings/branches";
  }
  return href === "/pemenuhan-po" || href === "/dashboard";
}

export function canManageSettings(profile: Profile) {
  return profile.role === "super_user";
}

export function canViewAllBranches(profile: Profile) {
  return profile.role === "super_user";
}

export function getConfiguredBranchIds(profile: Profile) {
  const branchIds = profile.branch_ids?.length
    ? profile.branch_ids
    : profile.branch_id
      ? [profile.branch_id]
      : [];
  return Array.from(new Set(branchIds));
}

export function getAssignedBranchIds(profile: Profile) {
  if (canViewAllBranches(profile)) return [];
  return getConfiguredBranchIds(profile);
}

export function canAccessBranch(profile: Profile, branchId: string) {
  return canViewAllBranches(profile) || getAssignedBranchIds(profile).includes(branchId);
}

export function canUseConfiguredBranch(profile: Profile, branchId: string) {
  return profile.role === "super_user" || getConfiguredBranchIds(profile).includes(branchId);
}
