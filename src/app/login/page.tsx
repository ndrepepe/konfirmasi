import { redirect } from "next/navigation";
import { signIn } from "@/app/actions/auth";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-md border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
          Konfirmasi
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Masuk ke aplikasi</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Gunakan email dan password yang dibuat oleh super user.
        </p>
        {params.error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}
        <form action={signIn} className="mt-6 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              required
              className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              required
              className="h-11 rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </label>
          <SubmitButton className="mt-2" pendingText="Masuk...">
            Masuk
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
