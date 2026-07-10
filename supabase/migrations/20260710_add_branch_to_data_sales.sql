alter table public.data_sales
add column if not exists branch_id uuid references public.branches(id);

create index if not exists data_sales_branch_id_idx
on public.data_sales(branch_id);
