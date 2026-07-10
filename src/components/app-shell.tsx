import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { NavPrefetcher } from "@/components/nav-prefetcher";
import { navItems } from "@/lib/nav";
import { canAccessMenu, roleLabels } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const items = navItems.filter((item) => canAccessMenu(profile, item.href));

  return (
    <div className="flex h-screen flex-col overflow-hidden lg:grid lg:grid-cols-[280px_1fr]">
      <NavPrefetcher hrefs={items.map((item) => item.href)} />
      <aside className="max-h-[45vh] shrink-0 overflow-y-auto border-b border-slate-200 bg-white lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="flex min-h-full flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Konfirmasi
            </p>
            <h1 className="mt-1 text-xl font-semibold text-slate-950">Prosedur Cabang</h1>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 py-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-3 lg:pt-5">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className="flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <item.icon className="h-4 w-4 text-teal-700" aria-hidden />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">{profile.full_name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{profile.email}</p>
              <p className="mt-2 text-xs font-medium text-teal-700">{roleLabels[profile.role]}</p>
            </div>
            <form action={signOut} className="mt-3">
              <button className="h-10 w-full rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:h-screen lg:px-8">
        {children}
      </main>
    </div>
  );
}

export function Guard({
  profile,
  href,
  children,
}: {
  profile: Profile;
  href: string;
  children: React.ReactNode;
}) {
  if (!canAccessMenu(profile, href)) redirect("/dashboard");
  return children;
}
