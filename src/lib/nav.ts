import {
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  KeyRound,
  LayoutDashboard,
  ReceiptText,
  UserRound,
  Users,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customer-baru", label: "Customer Baru", icon: FileText },
  { href: "/pemenuhan-po", label: "Konfirmasi PO", icon: FileCheck2 },
  { href: "/penagihan", label: "Penagihan", icon: ReceiptText },
  { href: "/rekap-input", label: "Rekap Input Harian", icon: ClipboardList },
  { href: "/data-sales", label: "Data Sales", icon: UserRound },
  { href: "/data-customer", label: "Data Customer", icon: FileText },
  { href: "/settings/branches", label: "Data Cabang", icon: Building2 },
  { href: "/change-password", label: "Ubah Password", icon: KeyRound },
  { href: "/settings/users", label: "Seting User", icon: Users },
] as const;
