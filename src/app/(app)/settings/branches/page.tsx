import { createBranch, importBranches } from "@/app/actions/settings";
import { Guard } from "@/components/app-shell";
import { EmptyState, FileInput, Input, PageHeader, Panel, SubmitButton } from "@/components/ui";
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
          {branches.length ? (
            <div className="overflow-x-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Cabang</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-4 py-3 font-semibold text-slate-950">{branch.code}</td>
                      <td className="px-4 py-3 text-slate-700">{branch.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="Belum ada cabang." />
          )}
        </Panel>
      </div>
    </Guard>
  );
}
