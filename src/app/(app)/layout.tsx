import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  return <AppShell profile={profile}>{children}</AppShell>;
}
