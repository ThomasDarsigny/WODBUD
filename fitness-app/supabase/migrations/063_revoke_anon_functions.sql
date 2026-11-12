-- 063 — Sécurité : plus aucune fonction exécutable sans compte, sauf les trois
-- qui servent avant la connexion. Les autres vérifiaient déjà auth.uid() à
-- l'intérieur (pas de faille connue), mais exposer 23 fonctions SECURITY
-- DEFINER au rôle anon est une surface inutile (conseiller Supabase 0028).
--
-- Gardées pour anon :
--   get_center_invite          aperçu d'un lien d'invitation de centre (et visite quotidienne)
--   get_class_by_invite_token  aperçu d'un lien de cours
--   get_shared_rank            page publique de partage de rang
--
-- Pourquoi révoquer `public` et pas seulement `anon` : Postgres accorde
-- EXECUTE à PUBLIC sur toute nouvelle fonction, et anon en hérite. On retire
-- donc PUBLIC et anon, puis on redonne explicitement le droit aux comptes
-- connectés et au service role. Les fonctions déclencheur (returns trigger)
-- ne sont appelables par personne via l'API : elles ne reçoivent rien.

do $$
declare
  f record;
begin
  for f in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prorettype = 'trigger'::regtype as is_trigger
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and has_function_privilege('anon', p.oid, 'execute')
       and p.proname not in ('get_center_invite', 'get_class_by_invite_token', 'get_shared_rank')
  loop
    execute format('revoke execute on function public.%I(%s) from public, anon', f.proname, f.args);
    if f.is_trigger then
      execute format('revoke execute on function public.%I(%s) from authenticated', f.proname, f.args);
    else
      execute format('grant execute on function public.%I(%s) to authenticated, service_role', f.proname, f.args);
    end if;
  end loop;
end
$$;

-- Les prochaines fonctions ne seront plus exposées à anon ni à PUBLIC par
-- défaut : `authenticated` et `service_role` gardent leur droit par défaut,
-- et un accès anonyme devra être accordé explicitement, comme pour les trois
-- fonctions ci-dessus.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;

-- Retour arrière (063_down) :
--   grant execute on all functions in schema public to public, anon;
--   alter default privileges for role postgres in schema public grant execute on functions to public, anon;
