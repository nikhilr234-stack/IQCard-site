alter table public.profiles
  add column if not exists whatsapp text not null default '',
  add column if not exists location text not null default '',
  add column if not exists public_email_visible boolean not null default false,
  add column if not exists phone_visible boolean not null default false,
  add column if not exists whatsapp_visible boolean not null default false,
  add column if not exists location_visible boolean not null default false;
