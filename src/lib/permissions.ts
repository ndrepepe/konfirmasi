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
  if (profile.role === "super_user") return true;
  if (profile.role === "accounting") return !href.startsWith("/settings");
  return href === "/pemenuhan-po" || href === "/dashboard";
}

export function canManageSettings(profile: Profile) {
  return profile.role === "super_user";
}

export function canViewAllBranches(profile: Profile) {
  return profile.role === "super_user" || profile.role === "accounting";
}
