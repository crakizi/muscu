create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  server_ts timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.docs enable row level security;
drop policy if exists "chacun ses donnees" on public.docs;
create policy "chacun ses donnees" on public.docs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists docs_sync_idx on public.docs (user_id, server_ts);
create or replace function public.docs_touch() returns trigger language plpgsql as $$ begin new.server_ts = clock_timestamp(); return new; end $$;
drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.docs_touch();
grant select, insert, update, delete on public.docs to authenticated;
