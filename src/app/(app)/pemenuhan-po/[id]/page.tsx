import Link from "next/link";
import { notFound } from "next/navigation";
import { Guard } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAttachmentLinks } from "@/lib/storage";
import type { ReportRow } from "@/lib/types";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  );
}

function FileList({
  title,
  files,
}: {
  title: string;
  files: Array<{ key: string; name: string; url: string; size?: number }>;
}) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      {files.length ? (
        <div className="mt-3 grid gap-2">
          {files.map((file) => (
            <a
              key={file.key}
              href={file.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              {file.name}
              {file.size ? (
                <span className="ml-2 text-xs font-normal text-slate-500">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              ) : null}
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Tidak ada file.</p>
      )}
    </div>
  );
}

export default async function PemenuhanPoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pemenuhan_po_reports")
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const row = data as ReportRow;
  const [poFiles, confirmationFiles] = await Promise.all([
    getAttachmentLinks(row.po_file),
    getAttachmentLinks(row.confirmation_file),
  ]);

  return (
    <Guard profile={profile} href="/pemenuhan-po">
      <PageHeader
        title="Detail Pemenuhan PO"
        description="Detail lengkap data Pemenuhan PO dan file lampiran."
      />
      <div className="grid gap-5">
        <Panel title="Data Pemenuhan PO">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Cabang" value={row.branches?.name ?? row.branches?.code} />
            <Field label="Nama Customer" value={String(row.customer_name ?? "")} />
            <Field label="Nama Sales" value={String(row.sales_name ?? "")} />
            <Field label="Tanggal PO" value={String(row.po_date ?? "")} />
            <Field label="No PO" value={String(row.po_number ?? "")} />
            <Field label="Contact Person" value={String(row.contact_person ?? "")} />
            <Field label="No HP" value={String(row.phone ?? "")} />
            <Field label="Input Oleh" value={row.profiles?.full_name ?? "-"} />
            <Field
              label="Tanggal Input"
              value={new Date(row.created_at).toLocaleString("id-ID")}
            />
          </div>
        </Panel>
        <Panel title="Lampiran">
          <div className="grid gap-4 lg:grid-cols-2">
            <FileList title="File PO" files={poFiles} />
            <FileList title="Bukti Konfirmasi" files={confirmationFiles} />
          </div>
        </Panel>
        <div>
          <Link
            href="/pemenuhan-po"
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </Link>
        </div>
      </div>
    </Guard>
  );
}
