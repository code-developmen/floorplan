-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Re-running it does not delete saved areas.
--
-- The site talks to Supabase with the anon key from the browser.
-- Do not put the service role key in the frontend.

create table if not exists public.areas (
  id uuid primary key,
  label text not null check (char_length(trim(label)) > 0),
  points jsonb not null check (jsonb_typeof(points) = 'array' and jsonb_array_length(points) >= 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.area_options (
  id uuid primary key,
  area_id uuid not null references public.areas (id) on delete cascade,
  variant_name text not null check (char_length(trim(variant_name)) > 0),
  name text not null check (char_length(trim(name)) > 0),
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0
);

create index if not exists area_options_area_id_idx
  on public.area_options (area_id, sort_order);

comment on table public.areas is
  'Surfaces outlined in the mask editor. points is [{x, y}, ...] in original image pixels.';
comment on column public.area_options.variant_name is
  'Option group. Shown as the heading above finishes, the same role as brand on built-in parts.';
comment on column public.area_options.hex is
  'Finish color applied to the masked pixels, #RRGGBB.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists areas_set_updated_at on public.areas;
create trigger areas_set_updated_at
  before update on public.areas
  for each row execute function public.set_updated_at();

alter table public.areas enable row level security;
alter table public.area_options enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.areas to anon, authenticated;
grant select, insert, update, delete on table public.area_options to anon, authenticated;

drop policy if exists "areas are readable" on public.areas;
drop policy if exists "areas can be inserted" on public.areas;
drop policy if exists "areas can be updated" on public.areas;
drop policy if exists "areas can be deleted" on public.areas;
drop policy if exists "area options are readable" on public.area_options;
drop policy if exists "area options can be inserted" on public.area_options;
drop policy if exists "area options can be updated" on public.area_options;
drop policy if exists "area options can be deleted" on public.area_options;

create policy "areas are readable"
  on public.areas for select
  to anon, authenticated
  using (true);

create policy "areas can be inserted"
  on public.areas for insert
  to anon, authenticated
  with check (true);

create policy "areas can be updated"
  on public.areas for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "areas can be deleted"
  on public.areas for delete
  to anon, authenticated
  using (true);

create policy "area options are readable"
  on public.area_options for select
  to anon, authenticated
  using (true);

create policy "area options can be inserted"
  on public.area_options for insert
  to anon, authenticated
  with check (true);

create policy "area options can be updated"
  on public.area_options for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "area options can be deleted"
  on public.area_options for delete
  to anon, authenticated
  using (true);
