# Stockage vidéo — Cloudflare R2

Les vidéos de démonstration des exercices vivent dans un bucket R2, pas dans
Supabase Storage. Raison : la vidéo est un usage à fort egress, et chaque lecture
d'un clip de 5 Mo coûte 5 Mo de bande passante. Sur le plan gratuit Supabase
(1 Go de stockage, 5 Go d'egress, 50 Mo par fichier), on est à environ un millier
de lectures par mois pour toute l'app. R2 donne 10 Go de stockage et un egress
gratuit sans plafond.

**Tout est branché côté code.** Il ne reste qu'à créer le compte et poser les
secrets ; aucune ligne à modifier.

## Ce qui est déjà en place

| | |
|---|---|
| `supabase/functions/r2-presign` | déployée, ACTIVE, `verify_jwt: true` |
| `supabase/functions/r2-delete` | déployée, ACTIVE, `verify_jwt: true` |
| `src/lib/r2.ts` | upload, suppression, traduction des erreurs |
| `exercises.video_url` | URL publique de lecture |
| `exercises.video_path` | **clé de l'objet dans le bucket** |

Les deux fonctions valident le JWT avec le service role puis vérifient que
l'utilisateur est dans `admin_users`. Le fichier ne transite jamais par Supabase :
la fonction signe une URL, le navigateur écrit directement dans le bucket.

## Activer R2

Récolte cinq valeurs. Elles ne vont que dans Supabase — nulle part dans le dépôt.

1. **Bucket.** Dashboard Cloudflare → R2 → créer un bucket. Son nom →
   `R2_BUCKET_NAME`.
2. **Account ID.** Visible sur la page R2, et dans l'endpoint S3
   `https://<account-id>.r2.cloudflarestorage.com` → `R2_ACCOUNT_ID`.
3. **Clés.** R2 → *Manage API Tokens* → nouveau token, permission **Object Read &
   Write**, limité à ce bucket → `R2_ACCESS_KEY_ID` et `R2_SECRET_ACCESS_KEY`.
   Le secret ne s'affiche qu'une fois.
4. **Accès public.** Bucket → Settings → Public access : soit le sous-domaine
   `r2.dev` (limité en débit, correct pour du dev), soit un domaine à toi comme
   `media.wodbud.com`. L'URL de base → `R2_PUBLIC_URL`, **sans barre oblique
   finale** : le code fait `${publicBaseUrl}/${key}`.
5. **CORS.** Bucket → Settings → CORS policy :
   ```json
   [{ "AllowedOrigins": ["https://wodbud.com", "http://localhost:5173"],
      "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type"],
      "MaxAgeSeconds": 3600 }]
   ```
   À ne pas sauter. Le navigateur envoie un `PUT` avec `Content-Type: video/mp4`,
   un en-tête non simple, donc un préflight `OPTIONS`. Sans CORS, l'upload échoue
   même avec des clés parfaites.

Puis Supabase → Edge Functions → Secrets : ajoute les cinq. `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` sont injectés par la plateforme, ne pas y toucher.
Pas de redéploiement nécessaire.

## Avant d'avoir R2 : l'app ne casse pas

Sans les secrets, `r2-presign` répond 500 `Secrets R2 manquants`. Le code traite
ce cas à part (`R2NotConfiguredError`) : **l'exercice est enregistré quand même**,
sans vidéo, et une bannière orange apparaît dans la liste des exercices —
« Exercice enregistré, mais la vidéo n'a pas été téléversée. »

Perdre un exercice que l'utilisateur vient de remplir parce que le stockage n'est
pas branché serait le pire des deux maux. Toute autre panne, elle, remonte
normalement et fait échouer l'opération.

C'est aussi un test : téléverse une vidéo aujourd'hui. Si tu vois la bannière,
toute la chaîne fonctionne — auth, admin, Edge Function, gestion d'erreur — et il
ne manque littéralement que R2.

## Cycle de vie d'une vidéo

`video_path` est la clé de l'objet (`exercises/<id>/<timestamp>.mp4`). C'est la
seule chose qui permet de le supprimer plus tard, d'où son stockage.

- **Remplacement** : la nouvelle vidéo est téléversée, la base pointe dessus,
  puis l'ancienne est supprimée du bucket.
- **Suppression d'un exercice** : la clé est relevée *avant* de supprimer la
  ligne, sinon plus rien ne dit où était le fichier.
- **Nettoyage en meilleur effort** : si la suppression R2 échoue, l'opération
  réussit quand même et un `console.warn` signale l'objet orphelin. Une vidéo
  orpheline est un problème de ménage, pas de données.

## Diagnostic

| Symptôme | Cause |
|---|---|
| Bannière « la vidéo n'a pas été téléversée » | un des 5 secrets manque ou est mal orthographié |
| `Seul un compte admin peut téléverser` | l'utilisateur n'est pas dans `admin_users` |
| `Le transfert vers le stockage a échoué` | politique CORS du bucket (étape 5) |
| Upload OK mais la vidéo ne joue pas | `R2_PUBLIC_URL` faux, ou accès public non activé |

## Limites en vigueur

200 Mo par fichier, `video/mp4`, `video/quicktime`, `video/webm`, `video/x-msvideo`.
Vérifié deux fois : dans `ExerciseFormModal` avant l'envoi, et dans `r2-presign`
avant de signer — la validation côté client est du confort, celle côté serveur est
la vraie.
