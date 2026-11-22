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

-- ============================================================================
-- AMIS (lot 1, 22/11/2026) — à exécuter une fois dans Supabase → SQL Editor.
-- Ne modifie pas la table docs : les données personnelles restent visibles par leur seul propriétaire.
-- Prérequis : Authentication → Sign In / Providers → Email → « Allow new users to sign up » activé,
-- pour que les amis puissent créer leur compte depuis l'app.
-- Principe : on ajoute des éléments (séance, recette, repas, diète) à son profil, sous forme de copie figée.
-- Profil privé (par défaut) : visible par ses amis seulement ; on devient ami par code d'invitation + acceptation.
-- Profil public : trouvable par pseudo, ajout sans validation, visible par tous les comptes de l'app.
-- ============================================================================
create extension if not exists pgcrypto;

create table if not exists public.fr_profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  pseudo text not null check (char_length(btrim(pseudo)) between 2 and 24),
  code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6)),
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index if not exists fr_profiles_pseudo_idx on public.fr_profiles (lower(pseudo));

create table if not exists public.fr_links (
  requester uuid not null references auth.users on delete cascade,
  target uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, target),
  check (requester <> target)
);

create table if not exists public.fr_shares (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  section text not null check (section in ('food', 'sport')),
  kind text not null check (kind in ('workout', 'recipe', 'meal', 'diet')),
  ref text,
  title text not null check (char_length(title) <= 120),
  summary text check (char_length(summary) <= 200),
  payload jsonb not null check (pg_column_size(payload) < 200000),
  created_at timestamptz not null default now()
);
create index if not exists fr_shares_owner_idx on public.fr_shares (owner, created_at desc);

-- Amitié acceptée entre deux comptes (security definer : évite la récursion des règles RLS).
create or replace function public.fr_is_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from fr_links l where l.status = 'accepted'
    and ((l.requester = a and l.target = b) or (l.requester = b and l.target = a)));
$$;
-- Profil visible par le compte connecté : le sien, un profil public, un ami, ou une demande en cours entre les deux.
create or replace function public.fr_can_see(owner_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select owner_id = auth.uid()
    or exists (select 1 from fr_profiles p where p.user_id = owner_id and p.is_public)
    or fr_is_friend(auth.uid(), owner_id);
$$;

alter table public.fr_profiles enable row level security;
alter table public.fr_links enable row level security;
alter table public.fr_shares enable row level security;

drop policy if exists "fr profils lecture" on public.fr_profiles;
create policy "fr profils lecture" on public.fr_profiles for select to authenticated using (
  public.fr_can_see(user_id)
  or exists (select 1 from public.fr_links l where (l.requester = auth.uid() and l.target = user_id) or (l.target = auth.uid() and l.requester = user_id)));
drop policy if exists "fr profils le sien" on public.fr_profiles;
create policy "fr profils le sien" on public.fr_profiles for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "fr liens lecture" on public.fr_links;
create policy "fr liens lecture" on public.fr_links for select to authenticated using (requester = auth.uid() or target = auth.uid());
drop policy if exists "fr liens retirer" on public.fr_links;
create policy "fr liens retirer" on public.fr_links for delete to authenticated using (requester = auth.uid() or target = auth.uid());
-- Pas d'insertion ni de modification directe : uniquement via fr_add et fr_answer.

drop policy if exists "fr partages lecture" on public.fr_shares;
create policy "fr partages lecture" on public.fr_shares for select to authenticated using (public.fr_can_see(owner));
drop policy if exists "fr partages les miens" on public.fr_shares;
create policy "fr partages les miens" on public.fr_shares for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());

-- Le code d'invitation n'est lisible que par son propriétaire (via fr_me).
revoke all on public.fr_profiles from anon, authenticated;
grant select (user_id, pseudo, is_public, updated_at) on public.fr_profiles to authenticated;
grant insert (pseudo, is_public), update (pseudo, is_public, updated_at), delete on public.fr_profiles to authenticated;
revoke all on public.fr_links from anon, authenticated;
grant select, delete on public.fr_links to authenticated;
revoke all on public.fr_shares from anon;
grant select, insert, update, delete on public.fr_shares to authenticated;

-- Mon profil Amis (avec mon code d'invitation).
create or replace function public.fr_me() returns json
language sql stable security definer set search_path = public as $$
  select row_to_json(p) from (select user_id, pseudo, code, is_public from fr_profiles where user_id = auth.uid()) p;
$$;

-- Ajouter un ami avec son code (ou le pseudo d'un profil public).
-- Profil public : amitié acceptée tout de suite. Profil privé : demande à accepter.
-- Si l'autre m'avait déjà envoyé une demande, elle est acceptée.
create or replace function public.fr_add(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare t fr_profiles; st text; me uuid := auth.uid();
begin
  if me is null then raise exception 'connexion requise'; end if;
  if not exists (select 1 from fr_profiles where user_id = me) then raise exception 'crée d''abord ton profil Amis'; end if;
  select * into t from fr_profiles where code = upper(btrim(p_code)) or (is_public and lower(pseudo) = lower(btrim(p_code))) limit 1;
  if t.user_id is null then raise exception 'code ou pseudo introuvable'; end if;
  if t.user_id = me then raise exception 'c''est ton propre code'; end if;
  if exists (select 1 from fr_links where requester = t.user_id and target = me) then
    update fr_links set status = 'accepted' where requester = t.user_id and target = me;
    st := 'accepted';
  else
    st := case when t.is_public then 'accepted' else 'pending' end;
    insert into fr_links (requester, target, status) values (me, t.user_id, st)
      on conflict (requester, target) do update set status = case when excluded.status = 'accepted' then 'accepted' else fr_links.status end
      returning status into st;
  end if;
  return json_build_object('user_id', t.user_id, 'pseudo', t.pseudo, 'status', st);
end $$;

-- Répondre à une demande reçue.
create or replace function public.fr_answer(p_from uuid, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ok then update fr_links set status = 'accepted' where requester = p_from and target = auth.uid();
  else delete from fr_links where requester = p_from and target = auth.uid(); end if;
end $$;

-- Désactiver Amis : retire mon profil, mes partages et mes liens.
create or replace function public.fr_leave() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from fr_shares where owner = auth.uid();
  delete from fr_links where requester = auth.uid() or target = auth.uid();
  delete from fr_profiles where user_id = auth.uid();
end $$;

revoke all on function public.fr_me(), public.fr_add(text), public.fr_answer(uuid, boolean), public.fr_leave(), public.fr_is_friend(uuid, uuid), public.fr_can_see(uuid) from public, anon;
grant execute on function public.fr_me(), public.fr_add(text), public.fr_answer(uuid, boolean), public.fr_leave(), public.fr_is_friend(uuid, uuid), public.fr_can_see(uuid) to authenticated;
