import { notFound } from "next/navigation";
import { Guard } from "@/components/app-shell";
import {
  AttachmentList,
  BackToReport,
  DetailField,
} from "@/components/report-detail";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatDateOnly, formatDateTimeWib } from "@/lib/date-time";
import { createClient } from "@/lib/database/server";
import { getAssignedBranchIds } from "@/lib/permissions";
import { getAttachmentLinks } from "@/lib/storage";
import type { ReportRow } from "@/lib/types";

export default async function PemenuhanPoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  const { id } = await params;
  const supabase = await createClient();
  let query = supabase
    .from("pemenuhan_po_reports")
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .eq("id", id);
  if (profile.role !== "super_user") {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) notFound();
    query = query.in("branch_id", branchIds);
    if (profile.role !== "accounting") {
      query = query.eq("created_by", profile.id);
    }
  }
  const { data, error } = await query.maybeSingle();

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
        title="Detail Konfirmasi PO"
        description="Detail lengkap data Konfirmasi PO dan file lampiran."
      />
      <div className="grid gap-5">
        <Panel title="Data Konfirmasi PO">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Cabang" value={row.branches?.name ?? row.branches?.code} />
            <DetailField label="Nama Customer" value={String(row.customer_name ?? "")} />
            <DetailField label="Nama Sales" value={String(row.sales_name ?? "")} />
            <DetailField label="Tanggal PO" value={formatDateOnly(row.po_date)} />
            <DetailField label="No PO" value={String(row.po_number ?? "")} />
            <DetailField label="Contact Person" value={String(row.contact_person ?? "")} />
            <DetailField label="No HP" value={String(row.phone ?? "")} />
            <DetailField label="Input Oleh" value={row.profiles?.full_name ?? "-"} />
            <DetailField
              label="Tanggal Input"
              value={`${formatDateTimeWib(row.created_at)} WIB`}
            />
          </div>
        </Panel>
        <Panel title="Lampiran">
          <div className="grid gap-4 lg:grid-cols-2">
            <AttachmentList title="File PO" files={poFiles} />
            <AttachmentList title="Bukti Konfirmasi" files={confirmationFiles} />
          </div>
        </Panel>
        <div>
          <BackToReport href="/pemenuhan-po?view=data" />
        </div>
      </div>
    </Guard>
  );
}
