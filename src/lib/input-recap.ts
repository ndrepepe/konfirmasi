import "server-only";
import { getSql } from "@/lib/db";
import type { UserRole } from "@/lib/types";

export type InputRecapKind = "customer_baru" | "pemenuhan_po" | "penagihan";

export type InputRecapRow = {
  id: string;
  kind: InputRecapKind;
  subject: string;
  created_at: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  creator_role: Extract<UserRole, "accounting" | "admin_cabang">;
  branch_code: string | null;
  branch_name: string | null;
};

export async function getDailyInputRecap(date: string) {
  const sql = getSql();
  const rows = (await sql.unsafe(
    `
      select
        report.id,
        report.kind,
        report.subject,
        report.created_at,
        profile.id as creator_id,
        profile.full_name as creator_name,
        profile.email as creator_email,
        profile.role as creator_role,
        branch.code as branch_code,
        branch.name as branch_name
      from (
        select
          id,
          'customer_baru'::text as kind,
          customer_new::text as subject,
          branch_id,
          created_by,
          created_at
        from customer_baru_reports
        union all
        select
          id,
          'pemenuhan_po'::text as kind,
          concat(customer_name, ' - PO ', po_number)::text as subject,
          branch_id,
          created_by,
          created_at
        from pemenuhan_po_reports
        union all
        select
          id,
          'penagihan'::text as kind,
          customer_name::text as subject,
          branch_id,
          created_by,
          created_at
        from penagihan_reports
      ) report
      join profiles profile on profile.id = report.created_by
      left join branches branch on branch.id = report.branch_id
      where profile.role in ('accounting', 'admin_cabang')
        and report.created_at >= ($1::date::timestamp at time zone 'Asia/Jakarta')
        and report.created_at < (($1::date + 1)::timestamp at time zone 'Asia/Jakarta')
      order by report.created_at desc
    `,
    [date],
  )) as unknown as Array<
    Omit<InputRecapRow, "created_at"> & { created_at: string | Date }
  >;

  return rows.map((row) => ({
    ...row,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  }));
}
