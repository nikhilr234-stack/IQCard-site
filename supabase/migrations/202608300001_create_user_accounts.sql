create table public.user_accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_accounts enable row level security;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_accounts (id, email)
  values (new.id, lower(new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.is_current_user_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_accounts
    where id = auth.uid() and role = 'admin'
  );
$$;

create policy "users can read their own account"
on public.user_accounts for select
to authenticated
using (id = auth.uid() or public.is_current_user_admin());

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_user_accounts_updated
  before update on public.user_accounts
  for each row execute procedure public.set_updated_at();
