create extension if not exists "pgcrypto";

create type public.user_role as enum ('super_user', 'accounting', 'admin_cabang');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.user_role not null,
  branch_id uuid references public.branches(id),
  created_at timestamptz not null default now(),
  constraint admin_cabang_requires_branch check (role <> 'admin_cabang' or branch_id is not null)
);

create table public.data_sales (
  id uuid primary key default gen_random_uuid(),
  sales_code text not null unique,
  sales_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table public.data_customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  branch_id uuid not null references public.branches(id),
  customer_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table public.customer_baru_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_new text not null,
  sales_requester text not null,
  bsoft_input_date date not null,
  customer_id text not null,
  contact_person text not null,
  phone text not null,
  confirmation_file jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.pemenuhan_po_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_name text not null,
  sales_name text not null,
  po_date date not null,
  po_number text not null,
  po_file jsonb,
  contact_person text not null,
  phone text not null,
  confirmation_file jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.penagihan_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id),
  customer_name text not null,
  proof_file jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index profiles_branch_id_idx on public.profiles(branch_id);
create index data_customers_branch_id_idx on public.data_customers(branch_id);
create index customer_baru_branch_id_idx on public.customer_baru_reports(branch_id);
create index pemenuhan_po_branch_id_idx on public.pemenuhan_po_reports(branch_id);
create index penagihan_branch_id_idx on public.penagihan_reports(branch_id);

create or replace function public.current_profile_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_profile_branch_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

create or replace function public.can_view_branch(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('super_user', 'accounting')
    or public.current_profile_branch_id() = target_branch_id
$$;

alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.data_sales enable row level security;
alter table public.data_customers enable row level security;
alter table public.customer_baru_reports enable row level security;
alter table public.pemenuhan_po_reports enable row level security;
alter table public.penagihan_reports enable row level security;

create policy "authenticated users can read branches"
on public.branches for select
to authenticated
using (true);

create policy "super users can manage branches"
on public.branches for all
to authenticated
using (public.current_profile_role() = 'super_user')
with check (public.current_profile_role() = 'super_user');

create policy "users can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.current_profile_role() = 'super_user');

create policy "super users can manage profiles"
on public.profiles for all
to authenticated
using (public.current_profile_role() = 'super_user')
with check (public.current_profile_role() = 'super_user');

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

create policy "super and accounting can read customer baru"
on public.customer_baru_reports for select
to authenticated
using (public.current_profile_role() in ('super_user', 'accounting'));

create policy "super and accounting can insert customer baru"
on public.customer_baru_reports for insert
to authenticated
with check (
  public.current_profile_role() in ('super_user', 'accounting')
  and created_by = auth.uid()
);

create policy "allowed users can read pemenuhan po"
on public.pemenuhan_po_reports for select
to authenticated
using (
  public.current_profile_role() in ('super_user', 'accounting')
  or (
    public.current_profile_role() = 'admin_cabang'
    and public.current_profile_branch_id() = branch_id
  )
);

create policy "allowed users can insert pemenuhan po"
on public.pemenuhan_po_reports for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_profile_role() in ('super_user', 'accounting')
    or (
      public.current_profile_role() = 'admin_cabang'
      and public.current_profile_branch_id() = branch_id
    )
  )
);

create policy "super and accounting can read penagihan"
on public.penagihan_reports for select
to authenticated
using (public.current_profile_role() in ('super_user', 'accounting'));

create policy "super and accounting can insert penagihan"
on public.penagihan_reports for insert
to authenticated
with check (
  public.current_profile_role() in ('super_user', 'accounting')
  and created_by = auth.uid()
);
