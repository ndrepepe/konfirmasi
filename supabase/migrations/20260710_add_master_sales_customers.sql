create table if not exists public.data_sales (
  id uuid primary key default gen_random_uuid(),
  sales_code text not null unique,
  sales_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table if not exists public.data_customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  branch_id uuid not null references public.branches(id),
  customer_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create index if not exists data_customers_branch_id_idx
on public.data_customers(branch_id);

alter table public.data_sales enable row level security;
alter table public.data_customers enable row level security;

create policy "authenticated users can read sales"
on public.data_sales for select
to authenticated
using (true);

create policy "super and accounting can manage sales"
on public.data_sales for all
to authenticated
using (public.current_profile_role() in ('super_user', 'accounting'))
with check (public.current_profile_role() in ('super_user', 'accounting'));

create policy "allowed users can read customers"
on public.data_customers for select
to authenticated
using (
  public.current_profile_role() in ('super_user', 'accounting')
  or (
    public.current_profile_role() = 'admin_cabang'
    and public.current_profile_branch_id() = branch_id
  )
);

create policy "super and accounting can manage customers"
on public.data_customers for all
to authenticated
using (public.current_profile_role() in ('super_user', 'accounting'))
with check (public.current_profile_role() in ('super_user', 'accounting'));
