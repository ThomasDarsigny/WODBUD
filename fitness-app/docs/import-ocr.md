# Import OCR — feuilles d'entraînement

Le tableau de bord admin a une section « Import rapide » qui lit des photos ou
des PDF de feuilles d'entraînement (au crayon, imprimées, peu importe) et en
extrait les exercices via Gemini, pour peupler la bibliothèque sans tout
retaper à la main. Utile pour rattraper plusieurs années d'archives d'un coup.

## Pourquoi une Edge Function

La première version appelait Gemini directement depuis le navigateur, avec la
clé dans `VITE_GEMINI_API_KEY`. N'importe quelle variable préfixée `VITE_` finit
en clair dans le JavaScript servi à tout le monde — n'importe qui aurait pu la
lire dans les DevTools et consommer ton quota.

`supabase/functions/ocr-import` fait l'appel côté serveur, avec le même patron
que `r2-presign` : le JWT de la requête est vérifié, puis l'appartenance à
`admin_users`. La clé Gemini ne quitte jamais Supabase.

## Activer la fonction

1. **Clé Gemini.** [Google AI Studio](https://aistudio.google.com/apikey) →
   créer une clé.
2. **Secrets.** Supabase → Edge Functions → Secrets :
   - `GEMINI_API_KEY` — la clé de l'étape 1.
   - `GEMINI_MODEL` — optionnel. Sans lui, la fonction utilise un modèle Flash
     stable codé en dur. Google publie une nouvelle version Flash tous les
     deux ou trois mois et finit par retirer les anciennes ; si l'import se
     met à échouer avec une erreur 404 sur le modèle, c'est probablement ça —
     vérifie [la liste des modèles](https://ai.google.dev/gemini-api/docs/models)
     et pose la nouvelle valeur ici, sans redéployer.
3. **Déploiement** (CLI Supabase, depuis `fitness-app/`) :
   ```
   supabase functions deploy ocr-import
   ```

Sans `GEMINI_API_KEY`, la fonction répond 500 et le bouton « Analyser » affiche
l'erreur — l'admin le voit tout de suite, pas de comportement silencieux.

## Ce que fait vraiment le composant

- **Images et PDF.** Un PDF est rendu en une image par page dans le navigateur
  (`src/lib/pdfToImages.ts`, via `pdfjs-dist`) avant l'envoi — Gemini ne reçoit
  jamais le PDF lui-même, seulement les pages en JPEG. Une feuille scannée en
  plusieurs pages n'a donc pas besoin d'être découpée à la main.
- **Un appel par image**, en séquence, avec 4 tentatives et un backoff
  (500 ms, 1 s, 2 s) côté fonction sur les erreurs 429/5xx — attendu quand on
  avale six ans de feuilles d'un coup plutôt qu'une seule photo.
- **Reprise sur échec.** Les fichiers qui échouent (PDF corrompu, timeout,
  quota) sont listés à part avec un bouton « Réessayer » qui ne retraite que
  ceux-là. Une fois importés, les exercices en erreur ont aussi un bouton de
  reprise, ligne par ligne regroupée.
- **Doublons.** `src/lib/textSimilarity.ts` normalise les noms (accents,
  casse, ponctuation) avant de comparer : un nom identique une fois normalisé
  est un doublon certain, décoché d'office. Un nom à 1-2 caractères près
  (« Squat » / « Squats ») est marqué « PROCHE » — signalé, mais laissé au
  choix du coach, parce que deux mouvements différents peuvent porter des noms
  voisins.

## Limites en vigueur

Côté fonction : ~25 Mo par image encodée en base64 (soit une image source
d'environ 18 Mo), 4 tentatives par image. Côté client : 60 pages par PDF —
au-delà, c'est probablement le mauvais fichier plutôt qu'une vraie feuille
d'entraînement.
