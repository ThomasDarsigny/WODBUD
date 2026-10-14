-- ═══════════════════════════════════════════════════════════════════
-- Complément de schema.sql : ce que `supabase db dump` ne sauvegarde pas,
-- parce que ça vit dans les schémas gérés par Supabase (auth, storage).
-- Relevé sur la base de production le 2026-10-14.
--
-- schema.sql + ce fichier = la structure complète de WODBUD.
-- ═══════════════════════════════════════════════════════════════════

-- Crée le profil à l'inscription (public.handle_new_user est dans schema.sql).
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Photos de profil : lecture publique, 2 Mo max, images seulement.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: lecture publique" on storage.objects for select to public
  using (bucket_id = 'avatars');
create policy "avatars: ajouter le sien" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: modifier le sien" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: supprimer le sien" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
