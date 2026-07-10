alter table public.customer_baru_reports
add column if not exists sales_requester text;

alter table public.pemenuhan_po_reports
add column if not exists sales_name text;

update public.customer_baru_reports
set sales_requester = ''
where sales_requester is null;

update public.pemenuhan_po_reports
set sales_name = ''
where sales_name is null;

alter table public.customer_baru_reports
alter column sales_requester set not null;

alter table public.pemenuhan_po_reports
alter column sales_name set not null;
