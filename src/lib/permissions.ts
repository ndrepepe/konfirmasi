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

export function canAccessMenu(profile: Profile, href: string) {
  if (href === "/change-password") return true;
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
  return profile.role === "super_user" || profile.role === "accounting";
}

export function getAssignedBranchIds(profile: Profile) {
  if (canViewAllBranches(profile)) return [];
  const branchIds = profile.branch_ids?.length
    ? profile.branch_ids
    : profile.branch_id
      ? [profile.branch_id]
      : [];
  return Array.from(new Set(branchIds));
}

export function canAccessBranch(profile: Profile, branchId: string) {
  return canViewAllBranches(profile) || getAssignedBranchIds(profile).includes(branchId);
}
