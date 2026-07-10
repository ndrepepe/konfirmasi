import { createBranch, importBranches } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { SearchableTable } from "@/components/searchable-table";
import { FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches } from "@/lib/data";

export default async function BranchesPage() {
  const profile = await requireProfile();
  const branches = await getBranches();

  return (
    <Guard profile={profile} href="/settings/branches">
      <PageHeader
        title="Data Cabang"
        description="Lihat data cabang. Penambahan cabang hanya tersedia untuk super user."
      />
      <div
        className={
          profile.role === "super_user" ? "grid gap-5 xl:grid-cols-[380px_1fr]" : "grid gap-5"
        }
      >
        {profile.role === "super_user" ? (
          <Panel title="Tambah Cabang">
            <form action={createBranch} className="grid gap-4">
              <Input label="Kode Cabang" name="code" />
              <Input label="Nama Cabang" name="name" />
              <SubmitButton />
            </form>
            <div className="mt-6 border-t border-slate-200 pt-5">
              <a
                href="/templates/template-data-cabang.xlsx"
                className="text-sm font-semibold text-teal-700 hover:text-teal-800"
              >
                Download template Excel
              </a>
              <form action={importBranches} className="mt-4 grid gap-4">
                <FileInput label="File Excel" name="excel_file" accept=".xlsx" />
                <SubmitButton>Import Excel</SubmitButton>
              </form>
            </div>
          </Panel>
        ) : null}
        <Panel title="Daftar Cabang">
          <SearchableTable
            rows={branches.map((branch) => ({
              id: branch.id,
              cells: {
                code: branch.code,
                name: branch.name,
              },
            }))}
            columns={[
              { key: "code", label: "Kode", strong: true },
              { key: "name", label: "Nama Cabang" },
            ]}
            emptyLabel="Belum ada cabang."
          />
        </Panel>
      </div>
    </Guard>
  );
}
