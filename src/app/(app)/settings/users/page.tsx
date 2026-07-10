import { createUser } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { SearchableTable } from "@/components/searchable-table";
import { SearchableSelect } from "@/components/searchable-select";
import { Input, InputDataLayout, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
      <InputDataLayout>
        <Panel title="Tambah User" className="flex min-h-0 flex-col">
          <form action={createUser} className="grid gap-4">
            <Input label="Nama User" name="full_name" />
            <Input label="Email" name="email" type="email" />
            <Input label="Password Awal" name="password" type="password" />
            <SearchableSelect
              label="Role"
              name="role"
              defaultValue={roleOptions[0]?.value}
              options={roleOptions.map((role) => ({
                value: role.value,
                label: role.label,
              }))}
            />
            <SearchableSelect
              label="Cabang"
              name="branch_id"
              required={false}
              placeholder="Tanpa cabang / semua cabang"
              options={branches.map((branch) => ({
                value: branch.id,
                label: `${branch.code} - ${branch.name}`,
                searchText: `${branch.code} ${branch.name}`,
              }))}
            />
            <SubmitButton>Buat User</SubmitButton>
          </form>
        </Panel>
        <Panel title="Daftar User" className="flex min-h-0 flex-col">
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
      </InputDataLayout>
    </Guard>
  );
}
