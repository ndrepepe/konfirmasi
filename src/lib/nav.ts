import {
  Building2,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ReceiptText,
  UserRound,
  Users,
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customer-baru", label: "Customer Baru", icon: FileText },
  { href: "/pemenuhan-po", label: "Pemenuhan PO", icon: FileCheck2 },
  { href: "/penagihan", label: "Penagihan", icon: ReceiptText },
  { href: "/data-sales", label: "Data Sales", icon: UserRound },
  { href: "/data-customer", label: "Data Customer", icon: FileText },
  { href: "/settings/users", label: "Seting User", icon: Users },
  { href: "/settings/branches", label: "Data Cabang", icon: Building2 },
] as const;
