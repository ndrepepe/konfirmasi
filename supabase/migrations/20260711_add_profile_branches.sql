create table if not exists public.profile_branches (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, branch_id)
);

insert into public.profile_branches (profile_id, branch_id)
select id, branch_id
from public.profiles
where branch_id is not null
on conflict do nothing;

create index if not exists profile_branches_branch_id_idx
on public.profile_branches(branch_id);

alter table public.profile_branches enable row level security;

drop policy if exists "users can read assigned profile branches" on public.profile_branches;
create policy "users can read assigned profile branches"
on public.profile_branches for select
to authenticated
using (profile_id = auth.uid() or public.current_profile_role() = 'super_user');

drop policy if exists "super users can manage profile branches" on public.profile_branches;
create policy "super users can manage profile branches"
on public.profile_branches for all
to authenticated
using (public.current_profile_role() = 'super_user')
with check (public.current_profile_role() = 'super_user');

create or replace function public.current_profile_branch_ids()
returns uuid[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(branch_id), '{}'::uuid[])
  from (
    select branch_id
    from public.profiles
    where id = auth.uid() and branch_id is not null
    union
    select branch_id
    from public.profile_branches
    where profile_id = auth.uid()
  ) assigned
$$;

create or replace function public.can_view_branch(target_branch_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_profile_role() in ('super_user', 'accounting')
    or target_branch_id = any(public.current_profile_branch_ids())
$$;

drop policy if exists "allowed users can read customers" on public.data_customers;
create policy "allowed users can read customers"
on public.data_customers for select
to authenticated
using (public.can_view_branch(branch_id));

drop policy if exists "allowed users can read pemenuhan po" on public.pemenuhan_po_reports;
create policy "allowed users can read pemenuhan po"
on public.pemenuhan_po_reports for select
to authenticated
using (public.can_view_branch(branch_id));

drop policy if exists "allowed users can insert pemenuhan po" on public.pemenuhan_po_reports;
create policy "allowed users can insert pemenuhan po"
on public.pemenuhan_po_reports for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_view_branch(branch_id)
);
