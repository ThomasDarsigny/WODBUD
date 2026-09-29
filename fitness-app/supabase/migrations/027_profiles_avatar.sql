-- ═══════════════════════════════════════════════════════════════════
-- Photo de profil.
--
-- Bucket Supabase Storage plutôt que R2 : contrairement aux vidéos
-- d'exercices, une photo de profil pèse quelques centaines de Ko et est vue
-- par peu de monde (le propriétaire, ses coéquipiers de classe). Le calcul
-- d'egress qui a justifié R2 (docs/stockage-video-r2.md) ne s'applique pas
-- ici — inutile d'ajouter une dépendance externe pour ça.
--
-- Bucket public en lecture (la photo doit s'afficher dans l'app sans URL
-- signée), écriture restreinte au propriétaire via le chemin
-- avatars/<user_id>/photo.<ext> — le premier segment du chemin fait office
-- de contrôle d'accès, patron standard de Supabase Storage.
-- ═══════════════════════════════════════════════════════════════════

alter table public.profiles add column avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "avatars: lecture publique"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: gérer le sien"
  on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
