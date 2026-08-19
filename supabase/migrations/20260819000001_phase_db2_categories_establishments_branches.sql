-- Lewad DB2: local discovery categories, establishments and branches.
-- Requires DB1 because it reuses public.set_updated_at().

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  slug text not null,
  description text,
  icon text,
  status text not null default 'active' check (status in ('active', 'hidden')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_idx unique (slug),
  constraint categories_slug_not_empty check (btrim(slug) <> '')
);

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  slug text not null,
  description text,
  phone text,
  whatsapp text,
  website text,
  status text not null default 'pending' check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  is_verified boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishments_slug_idx unique (slug),
  constraint establishments_slug_not_empty check (btrim(slug) <> '')
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  phone text,
  whatsapp text,
  address text,
  city text,
  neighborhood text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  is_main boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint branches_latitude_in_range check (latitude is null or latitude between -90 and 90),
  constraint branches_longitude_in_range check (longitude is null or longitude between -180 and 180)
);

create index if not exists categories_status_idx on public.categories (status);
create index if not exists categories_sort_order_idx on public.categories (sort_order);
create index if not exists establishments_name_idx on public.establishments (name);
create index if not exists establishments_name_lower_idx on public.establishments (lower(name));
create index if not exists establishments_category_id_idx on public.establishments (category_id);
create index if not exists establishments_status_idx on public.establishments (status);
create index if not exists establishments_is_verified_idx on public.establishments (is_verified);
create index if not exists branches_establishment_id_idx on public.branches (establishment_id);
create index if not exists branches_status_idx on public.branches (status);
create index if not exists branches_city_idx on public.branches (city);
create index if not exists branches_neighborhood_idx on public.branches (neighborhood);
create index if not exists branches_location_idx on public.branches (latitude, longitude);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists establishments_set_updated_at on public.establishments;
create trigger establishments_set_updated_at
before update on public.establishments
for each row execute function public.set_updated_at();

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.establishments enable row level security;
alter table public.branches enable row level security;

drop policy if exists "Authenticated users can read active categories" on public.categories;
create policy "Authenticated users can read active categories"
on public.categories for select
to authenticated
using (status = 'active');

drop policy if exists "Authenticated users can read approved establishments" on public.establishments;
create policy "Authenticated users can read approved establishments"
on public.establishments for select
to authenticated
using (status = 'approved');

drop policy if exists "Authenticated users can read active approved branches" on public.branches;
create policy "Authenticated users can read active approved branches"
on public.branches for select
to authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.establishments as establishment
    where establishment.id = branches.establishment_id
      and establishment.status = 'approved'
  )
);

-- No normal-user write access in DB2. Future admin/submission flows need explicit policies.
revoke all on public.categories from anon, authenticated;
revoke all on public.establishments from anon, authenticated;
revoke all on public.branches from anon, authenticated;
grant select on public.categories to authenticated;
grant select on public.establishments to authenticated;
grant select on public.branches to authenticated;

-- Development seed data only. Bankily is a fictional/demo entry, not an official listing.
insert into public.categories (name, slug, sort_order)
values
  ('Finance', 'finance', 10),
  ('Santé', 'sante', 20),
  ('Restaurants', 'restaurants', 30),
  ('Sport', 'sport', 40),
  ('Services', 'services', 50),
  ('Shopping', 'shopping', 60),
  ('Maisons', 'maisons', 70),
  ('Transport', 'transport', 80)
on conflict (slug) do nothing;

insert into public.establishments (
  category_id, name, slug, description, phone, whatsapp, website, status, is_verified
)
select
  category.id,
  'Bankily',
  'bankily',
  'Service financier de démonstration pour Lewad V1.',
  '+222 36 XX XX XX',
  '+222 36 XX XX XX',
  'bankily.mr',
  'approved',
  true
from public.categories as category
where category.slug = 'finance'
on conflict (slug) do nothing;

insert into public.branches (
  establishment_id, name, address, city, neighborhood, latitude, longitude, is_main, status
)
select
  establishment.id,
  seed.name,
  seed.address,
  'Nouakchott',
  seed.neighborhood,
  seed.latitude,
  seed.longitude,
  seed.is_main,
  'active'
from public.establishments as establishment
cross join (
  values
    ('Bankily — Tevragh Zeina', 'Adresse de démonstration — Tevragh Zeina', 'Tevragh Zeina', 18.1190::numeric, -15.9780::numeric, true),
    ('Bankily — Ksar', 'Adresse de démonstration — Ksar', 'Ksar', 18.0980::numeric, -15.9570::numeric, false),
    ('Bankily — Arafat', 'Adresse de démonstration — Arafat', 'Arafat', 18.0580::numeric, -15.9410::numeric, false)
) as seed(name, address, neighborhood, latitude, longitude, is_main)
where establishment.slug = 'bankily'
  and not exists (
    select 1
    from public.branches as existing_branch
    where existing_branch.establishment_id = establishment.id
      and existing_branch.name = seed.name
  );
