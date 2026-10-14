-- ═══════════════════════════════════════════════════════════════════
-- Notifications push sur téléphone.
--
-- push_subscriptions : un abonnement par appareil (navigateur ou app
-- installée). Chacun ne gère que les siens ; l'envoi se fait par la
-- fonction Edge `push` avec la clé service.
--
-- Rappel du matin : pg_cron appelle `push` chaque jour à 12 h UTC (8 h à
-- Montréal l'été, 7 h l'hiver). La fonction vérifie un secret généré ici,
-- dans Vault : il ne sort jamais de la base, aucun fichier ne le contient.
-- ═══════════════════════════════════════════════════════════════════

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: lire les siens" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy "push_subscriptions: ajouter le sien" on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "push_subscriptions: modifier le sien" on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subscriptions: supprimer le sien" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ── Secret de la tâche planifiée ────────────────────────────────────
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_cron_secret',
  'Authentifie l''appel quotidien de pg_cron à la fonction Edge push');

create function public.wodbud_check_push_cron_secret(p_secret text) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'push_cron_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.wodbud_check_push_cron_secret(text) from public, anon, authenticated;
grant execute on function public.wodbud_check_push_cron_secret(text) to service_role;

-- ── Rappel quotidien ────────────────────────────────────────────────
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.schedule(
  'push-rappel-du-matin',
  '0 12 * * *',
  $$
  select net.http_post(
    url := 'https://onyifpsvwprviuhnomxg.supabase.co/functions/v1/push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'push_cron_secret')
    ),
    body := '{"type":"daily"}'::jsonb
  );
  $$
);
