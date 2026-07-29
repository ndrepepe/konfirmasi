import Link from "next/link";
import { createBranch, deleteBranch, importBranches, updateBranch } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { PageSubnav, type PageView } from "@/components/page-subnav";
import { SearchableTable } from "@/components/searchable-table";
import {
  FileInput,
  Input,
  PageHeader,
  Panel,
  SubmitButton,
} from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getBranches } from "@/lib/data";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; view?: PageView }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const branches = await getBranches();
  const editingBranch = branches.find((branch) => branch.id === params.edit);
  const activeView = params.edit ? "input" : params.view === "data" ? "data" : "input";

  return (
    <Guard profile={profile} href="/settings/branches">
      <PageHeader
        title="Data Cabang"
        description="Lihat data cabang. Penambahan cabang hanya tersedia untuk super user."
      />
      <PageSubnav baseHref="/settings/branches" activeView={activeView} />
      <div className="grid gap-5">
        {activeView === "input" ? (
          <Panel title={editingBranch ? "Edit Cabang" : "Tambah Cabang"} className="flex min-h-0 flex-col">
            <form action={editingBranch ? updateBranch : createBranch} className="grid gap-4">
              {editingBranch ? <input type="hidden" name="id" value={editingBranch.id} /> : null}
              <Input label="Kode Cabang" name="code" defaultValue={editingBranch?.code} />
              <Input label="Nama Cabang" name="name" defaultValue={editingBranch?.name} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <SubmitButton>{editingBranch ? "Update" : "Simpan"}</SubmitButton>
                {editingBranch ? (
                  <Link
                    href="/settings/branches?view=input"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10"
                  >
                    Batal
                  </Link>
                ) : null}
              </div>
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
        ) : (
        <Panel title="Daftar Cabang" className="flex min-h-0 flex-col">
          <SearchableTable
            rows={branches.map((branch) => ({
              id: branch.id,
              editHref:
                profile.role === "super_user"
                  ? `/settings/branches?view=input&edit=${branch.id}`
                  : undefined,
              deleteLabel: `cabang ${branch.name}`,
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
            deleteAction={profile.role === "super_user" ? deleteBranch : undefined}
          />
        </Panel>
        )}
      </div>
    </Guard>
  );
}
