import { ExternalLink } from "lucide-react";
import Link from "next/link";

export function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</div>
    </div>
  );
}

export function AttachmentList({
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
              className="inline-flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
            >
              <span className="min-w-0 truncate">
                {file.name}
                {file.size ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                ) : null}
              </span>
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-500">Tidak ada file.</p>
      )}
    </div>
  );
}

export function BackToReport({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
    >
      Kembali
    </Link>
  );
}
