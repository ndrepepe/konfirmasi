import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { getSql } from "@/lib/db";
import { getAssignedBranchIds } from "@/lib/permissions";
import { resolveLocalStoragePath } from "@/lib/storage";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

async function canReadAttachment(storageKey: string, profile: Awaited<ReturnType<typeof requireProfile>>) {
  const sql = getSql();
  const pattern = `%${storageKey}%`;
  const rows = await sql`
    select created_by, branch_id
    from (
      select created_by, branch_id
      from customer_baru_reports
      where confirmation_file::text like ${pattern}
      union all
      select created_by, branch_id
      from pemenuhan_po_reports
      where po_file::text like ${pattern}
         or confirmation_file::text like ${pattern}
      union all
      select created_by, branch_id
      from penagihan_reports
      where proof_file::text like ${pattern}
    ) attachment
    limit 1
  `;
  const attachment = rows[0] as { created_by: string; branch_id: string } | undefined;
  if (!attachment) return false;
  if (profile.role === "super_user") return true;

  return (
    attachment.created_by === profile.id &&
    getAssignedBranchIds(profile).includes(attachment.branch_id)
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const profile = await requireProfile();

  const { key } = await params;
  const storageKey = key.join("/");
  if (!(await canReadAttachment(storageKey, profile))) {
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }
  const filePath = resolveLocalStoragePath(storageKey);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    }

    const body = await readFile(filePath);
    const type = contentTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(body, {
      headers: {
        "content-type": type,
        "content-length": String(fileStat.size),
        "cache-control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
  }
}
