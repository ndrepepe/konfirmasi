import { notFound, redirect } from "next/navigation";
import { Guard } from "@/components/app-shell";
import {
  AttachmentList,
  BackToReport,
  DetailField,
} from "@/components/report-detail";
import { PageHeader, Panel } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { formatDateOnly, formatDateTimeWib } from "@/lib/date-time";
import { createAdminClient } from "@/lib/database/admin";
import { getAssignedBranchIds } from "@/lib/permissions";
import { getAttachmentLinks } from "@/lib/storage";
import type { ReportRow } from "@/lib/types";

export default async function CustomerBaruDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireProfile();
  if (profile.role === "admin_cabang") redirect("/dashboard");

  const { id } = await params;
  const admin = createAdminClient();
  let query = admin
    .from("customer_baru_reports")
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
  const confirmationFiles = await getAttachmentLinks(row.confirmation_file);

  return (
    <Guard profile={profile} href="/customer-baru">
      <PageHeader
        title="Detail Customer Baru"
        description="Detail lengkap laporan customer baru dan bukti konfirmasi."
      />
      <div className="grid gap-5">
        <Panel title="Data Customer Baru">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailField label="Cabang" value={row.branches?.name ?? row.branches?.code} />
            <DetailField label="Customer Baru" value={String(row.customer_new ?? "")} />
            <DetailField label="Sales" value={String(row.sales_requester ?? "")} />
            <DetailField label="Tanggal Input Bsoft" value={formatDateOnly(row.bsoft_input_date)} />
            <DetailField label="ID Customer" value={String(row.customer_id ?? "")} />
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
          <AttachmentList title="Bukti Konfirmasi" files={confirmationFiles} />
        </Panel>
        <div>
          <BackToReport href="/customer-baru?view=data" />
        </div>
      </div>
    </Guard>
  );
}
