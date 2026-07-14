create index if not exists data_customers_branch_status_name_idx
on public.data_customers(branch_id, status, customer_name);

create index if not exists data_customers_branch_name_idx
on public.data_customers(branch_id, customer_name);

create index if not exists data_sales_branch_status_name_idx
on public.data_sales(branch_id, status, sales_name);

create index if not exists customer_baru_branch_created_idx
on public.customer_baru_reports(branch_id, created_at desc);

create index if not exists pemenuhan_po_branch_created_idx
on public.pemenuhan_po_reports(branch_id, created_at desc);

create index if not exists penagihan_branch_created_idx
on public.penagihan_reports(branch_id, created_at desc);
