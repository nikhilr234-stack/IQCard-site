create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.user_accounts (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  full_name text not null default '',
  headline text not null default '',
  tagline text not null default '',
  bio text not null default '',
  phone text not null default '',
  email text not null default '',
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table public.profile_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profile_links enable row level security;

create policy "owners manage their profile"
on public.profiles for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "published profiles are public"
on public.profiles for select to anon, authenticated
using (status = 'published');

create policy "owners manage profile links"
on public.profile_links for all to authenticated
using (exists (select 1 from public.profiles where id = profile_id and owner_id = auth.uid()))
with check (exists (select 1 from public.profiles where id = profile_id and owner_id = auth.uid()));

create policy "published profile links are public"
on public.profile_links for select to anon, authenticated
using (exists (select 1 from public.profiles where id = profile_id and status = 'published'));

create trigger on_profiles_updated
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger on_profile_links_updated
  before update on public.profile_links
  for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', false)
on conflict (id) do nothing;

create policy "owners upload their own profile image"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners update their own profile image"
on storage.objects for update to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owners delete their own profile image"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "published profile images are readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-images');
