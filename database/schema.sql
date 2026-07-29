create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('super_user', 'accounting', 'admin_cabang');
exception when duplicate_object then null;
end $$;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create unique index if not exists app_users_email_lower_idx on app_users (lower(email));

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references app_users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role user_role not null,
  branch_id uuid references branches(id),
  created_at timestamptz not null default now(),
  constraint admin_cabang_requires_branch check (role <> 'admin_cabang' or branch_id is not null)
);

create table if not exists profile_branches (
  profile_id uuid not null references profiles(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, branch_id)
);

create table if not exists data_sales (
  id uuid primary key default gen_random_uuid(),
  sales_code text not null unique,
  branch_id uuid references branches(id),
  sales_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table if not exists data_customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique,
  branch_id uuid not null references branches(id),
  customer_name text not null,
  status text not null default 'Aktif' check (status in ('Aktif', 'Nonaktif')),
  created_at timestamptz not null default now()
);

create table if not exists customer_baru_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_new text not null,
  sales_requester text not null,
  bsoft_input_date date not null,
  customer_id text not null,
  contact_person text not null,
  phone text not null,
  confirmation_file jsonb,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists pemenuhan_po_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_name text not null,
  sales_name text not null,
  po_date date not null,
  po_number text not null,
  po_file jsonb,
  contact_person text not null,
  phone text not null,
  confirmation_file jsonb,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists penagihan_reports (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id),
  customer_name text not null,
  proof_file jsonb,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists profiles_branch_id_idx on profiles(branch_id);
create index if not exists profile_branches_branch_id_idx on profile_branches(branch_id);
create index if not exists data_sales_branch_id_idx on data_sales(branch_id);
create index if not exists data_customers_branch_id_idx on data_customers(branch_id);
create index if not exists data_customers_branch_status_name_idx on data_customers(branch_id, status, customer_name);
create index if not exists data_customers_branch_name_idx on data_customers(branch_id, customer_name);
create index if not exists data_sales_branch_status_name_idx on data_sales(branch_id, status, sales_name);
create index if not exists customer_baru_branch_created_idx on customer_baru_reports(branch_id, created_at desc);
create index if not exists pemenuhan_po_branch_created_idx on pemenuhan_po_reports(branch_id, created_at desc);
create index if not exists penagihan_branch_created_idx on penagihan_reports(branch_id, created_at desc);
