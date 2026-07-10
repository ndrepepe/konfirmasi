import { createUser } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { SearchableTable } from "@/components/searchable-table";
import { Input, PageHeader, Panel, Select, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches } from "@/lib/data";
import { roleLabels, roleOptions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

async function getUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, branch_id, branches(id, code, name)")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Profile[];
}

export default async function UsersPage() {
  const profile = await requireProfile();
  const [branches, users] = await Promise.all([getBranches(), getUsers()]);

  return (
    <Guard profile={profile} href="/settings/users">
      <PageHeader
        title="Seting User"
        description="Buat user baru, tentukan role, dan kaitkan admin cabang ke cabang masing-masing."
      />
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <Panel title="Tambah User">
          <form action={createUser} className="grid gap-4">
            <Input label="Nama User" name="full_name" />
            <Input label="Email" name="email" type="email" />
            <Input label="Password Awal" name="password" type="password" />
            <Select label="Role" name="role">
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
            <Select label="Cabang" name="branch_id" required={false}>
              <option value="">Tanpa cabang / semua cabang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.code} - {branch.name}
                </option>
              ))}
            </Select>
            <SubmitButton>Buat User</SubmitButton>
          </form>
        </Panel>
        <Panel title="Daftar User">
          <SearchableTable
            rows={users.map((user) => ({
              id: user.id,
              cells: {
                full_name: user.full_name,
                email: user.email,
                role: roleLabels[user.role],
                branch: user.branches?.name ?? "Semua cabang",
              },
            }))}
            columns={[
              { key: "full_name", label: "Nama", strong: true },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", filterable: true },
              { key: "branch", label: "Cabang", filterable: true },
            ]}
            emptyLabel="Belum ada user."
          />
        </Panel>
      </div>
    </Guard>
  );
}
