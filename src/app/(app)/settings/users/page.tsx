import Link from "next/link";
import { createUser, deleteUser, updateUser } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { MultiBranchSelect } from "@/components/multi-branch-select";
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
    .select(
      "id, full_name, email, role, branch_id, branches(id, code, name), profile_branches(branch_id, branches(id, code, name))",
    )
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((user) => {
    const profile = user as unknown as Profile & {
      profile_branches?: Array<{ branch_id: string; branches: Profile["branches"] }>;
    };

    const branchIds = profile.profile_branches?.map((item) => item.branch_id) ?? [];

    const assignedBranches =
      profile.profile_branches
        ?.map((item) => item.branches)
        .filter((branch): branch is NonNullable<Profile["branches"]> => Boolean(branch)) ?? [];

    return {
      ...profile,
      branch_ids: branchIds.length ? branchIds : profile.branch_id ? [profile.branch_id] : [],
      assigned_branches: assignedBranches.length
        ? assignedBranches
        : profile.branches
          ? [profile.branches]
          : [],
    };
  });
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; error?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [branches, users] = await Promise.all([getBranches(), getUsers()]);
  const editingUser = users.find((user) => user.id === params.edit);

  return (
    <Guard profile={profile} href="/settings/users">
      <PageHeader
        title="Seting User"
        description="Buat user baru, tentukan role, dan kaitkan admin cabang ke cabang masing-masing."
      />
      <InputDataLayout>
        <Panel title={editingUser ? "Edit User" : "Tambah User"} className="flex min-h-0 flex-col">
          {params.error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}
          <form action={editingUser ? updateUser : createUser} className="grid gap-4">
            {editingUser ? <input type="hidden" name="id" value={editingUser.id} /> : null}
            <Input label="Nama User" name="full_name" defaultValue={editingUser?.full_name} />
            <Input label="Email" name="email" type="email" defaultValue={editingUser?.email} />
            {!editingUser ? <Input label="Password Awal" name="password" type="password" /> : null}
            <SearchableSelect
              label="Role"
              name="role"
              defaultValue={editingUser?.role ?? roleOptions[0]?.value}
              options={roleOptions.map((role) => ({
                value: role.value,
                label: role.label,
              }))}
            />
            <MultiBranchSelect branches={branches} defaultValues={editingUser?.branch_ids ?? []} />
            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitButton>{editingUser ? "Update User" : "Buat User"}</SubmitButton>
              {editingUser ? (
                <Link
                  href="/settings/users"
                  className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                >
                  Batal
                </Link>
              ) : null}
            </div>
          </form>
        </Panel>
        <Panel title="Daftar User" className="flex min-h-0 flex-col">
          <SearchableTable
            rows={users.map((user) => ({
              id: user.id,
              editHref: `/settings/users?edit=${user.id}`,
              deleteLabel: `user ${user.full_name}`,
              cells: {
                full_name: user.full_name,
                email: user.email,
                role: roleLabels[user.role],
                branch: user.assigned_branches?.length
                  ? user.assigned_branches.map((branch) => branch.name).join(", ")
                  : "Semua cabang",
              },
            }))}
            columns={[
              { key: "full_name", label: "Nama", strong: true },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", filterable: true },
              { key: "branch", label: "Cabang", filterable: true },
            ]}
            emptyLabel="Belum ada user."
            deleteAction={profile.role === "super_user" ? deleteUser : undefined}
          />
        </Panel>
      </InputDataLayout>
    </Guard>
  );
}
