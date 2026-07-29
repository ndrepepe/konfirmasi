import { changePassword } from "@/app/actions/auth";
import { Guard } from "@/components/app-shell";
import { SearchableSelect } from "@/components/searchable-select";
import { Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/database/server";
import type { Profile } from "@/lib/types";

async function getUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as Pick<Profile, "id" | "full_name" | "email">[];
}

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const users = profile.role === "super_user" ? await getUsers() : [];

  return (
    <Guard profile={profile} href="/change-password">
      <PageHeader
        title="Ubah Password"
        description={
          profile.role === "super_user"
            ? "Ubah password user aplikasi."
            : "Ubah password akun Anda sendiri."
        }
      />
      <div className="grid gap-5">
        <Panel title="Form Ubah Password">
          {params.error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}
          {params.success ? (
            <div className="mb-4 rounded-md border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700">
              {params.success}
            </div>
          ) : null}
          <form action={changePassword} autoComplete="off" className="grid gap-4">
            {profile.role === "super_user" ? (
              <SearchableSelect
                label="User"
                name="user_id"
                defaultValue={profile.id}
                options={users.map((user) => ({
                  value: user.id,
                  label: `${user.full_name} - ${user.email}`,
                  searchText: `${user.full_name} ${user.email}`,
                }))}
              />
            ) : null}
            <Input
              label="Password Baru"
              name="password"
              type="password"
              autoComplete="new-password"
            />
            <Input
              label="Konfirmasi Password"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
            />
            <SubmitButton>Update Password</SubmitButton>
          </form>
        </Panel>
      </div>
    </Guard>
  );
}
