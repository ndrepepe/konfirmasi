"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition active:scale-[0.99] lg:gap-3",
        active
          ? "bg-teal-50 text-red-600"
          : "text-black hover:bg-teal-50",
      )}
    >
      {children}
    </Link>
  );
}
