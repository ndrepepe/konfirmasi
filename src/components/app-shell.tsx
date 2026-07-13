import { redirect } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { NavLink } from "@/components/nav-link";
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
  const hrefs = items.map((item) => item.href);

  return (
    <div className="flex min-h-screen flex-col lg:grid lg:h-screen lg:grid-cols-[280px_1fr] lg:overflow-hidden">
      <NavPrefetcher hrefs={hrefs} />
      <aside className="max-h-[45vh] shrink-0 overflow-y-auto border-b border-slate-200 bg-white lg:h-screen lg:max-h-none lg:border-b-0 lg:border-r">
        <div className="flex min-h-full flex-col">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
              Konfirmasi
            </p>
            <h1 className="mt-1 text-lg font-semibold text-slate-950 sm:text-xl">
              Prosedur Cabang
            </h1>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 py-3 sm:px-4 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:pb-3 lg:pt-5">
            {items.map((item) => (
              <NavLink key={item.href} href={item.href}>
                <item.icon className="h-4 w-4 text-teal-700" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden border-t border-slate-200 bg-white p-4 sm:block lg:sticky lg:bottom-0">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">{profile.full_name}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{profile.email}</p>
              <p className="mt-2 text-xs font-medium text-teal-700">{roleLabels[profile.role]}</p>
            </div>
            <form action={signOut} className="mt-3">
              <button
                type="submit"
                className="h-10 w-full rounded-md border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-6 lg:h-screen lg:min-h-0 lg:overflow-y-auto lg:px-8">
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
