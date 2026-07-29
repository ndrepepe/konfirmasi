import { notFound, redirect } from "next/navigation";
import { Guard } from "@/components/app-shell";
import {
  AttachmentList,
  BackToReport,
  DetailField,
} from "@/components/report-detail";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatDateTimeWib } from "@/lib/date-time";
import { createAdminClient } from "@/lib/database/admin";
import { getAssignedBranchIds } from "@/lib/permissions";
import { getAttachmentLinks } from "@/lib/storage";
import type { ReportRow } from "@/lib/types";

export default async function PenagihanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const { id } = await params;
  const admin = createAdminClient();
  let query = admin
    .from("penagihan_reports")
    .select("*, branches(id, code, name), profiles(full_name, email)")
    .eq("id", id);
  if (profile.role !== "super_user") {
    const branchIds = getAssignedBranchIds(profile);
    if (!branchIds.length) notFound();
    query = query.eq("created_by", profile.id).in("branch_id", branchIds);
  }
  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  const row = data as ReportRow;
  const proofFiles = await getAttachmentLinks(row.proof_file);

  return (
    <Guard profile={profile} href="/penagihan">
      <PageHeader
        title="Detail Penagihan"
        description="Detail lengkap laporan penagihan dan file bukti."
      />
      <div className="grid gap-5">
        <Panel title="Data Penagihan">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Cabang" value={row.branches?.name ?? row.branches?.code} />
            <DetailField label="Customer" value={String(row.customer_name ?? "")} />
            <DetailField label="Input Oleh" value={row.profiles?.full_name ?? "-"} />
            <DetailField
              label="Tanggal Input"
              value={`${formatDateTimeWib(row.created_at)} WIB`}
            />
          </div>
        </Panel>
        <Panel title="Lampiran">
          <AttachmentList title="Bukti Penagihan" files={proofFiles} />
        </Panel>
        <div>
          <BackToReport href="/penagihan?view=data" />
        </div>
      </div>
    </Guard>
  );
}
