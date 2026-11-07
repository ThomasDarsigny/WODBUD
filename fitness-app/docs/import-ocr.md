# Import d'exercices — CSV, PDF et photos de feuilles

Le tableau de bord admin — et, depuis la migration 050, l'écran Exercices du
proprio et des entraîneurs chefs d'un centre — a une section « Importer des
exercices » qui lit des CSV, des photos ou des PDF de feuilles d'entraînement
(au crayon, imprimées, peu importe) et en extrait les exercices, pour peupler
la bibliothèque sans tout retaper à la main. Utile pour rattraper plusieurs
années d'archives d'un coup.

## Qui lit quoi

- **CSV** : lu dans le navigateur (`src/lib/exerciseImport.ts`), sans passer par
  le serveur. Colonnes reconnues en français, anglais ou espagnol ; seule la
  colonne du nom est obligatoire ; virgule ou point-virgule (export d'Excel en
  français).
- **Photos et PDF** : lus par **Claude** dans la fonction Edge
  `supabase/functions/ocr-import`. Un PDF est d'abord rendu en une image par
  page dans le navigateur (`src/lib/pdfToImages.ts`), ce qui donne la
  progression page par page et la reprise des seules pages en échec.

## Pourquoi une fonction Edge

Une clé dans une variable `VITE_*` finit en clair dans le JavaScript servi à
tout le monde. La fonction fait l'appel côté serveur : le jeton de la requête
est vérifié, puis l'appartenance à `admin_users` — ou le rôle de proprio /
entraîneur chef du centre passé en `center_id`. La clé Anthropic ne quitte
jamais Supabase.

La réponse de Claude est une **sortie structurée** (schéma JSON imposé :
nom, catégorie, muscle principal, description, occurrences) : elle respecte
toujours le format, il n'y a pas de texte libre à interpréter.

## Activer la fonction

1. **Clé Anthropic** : [console Anthropic](https://platform.claude.com) →
   API keys. C'est la même clé que l'assistant IA.
2. **Secrets** — Supabase → Edge Functions → Secrets :
   - `ANTHROPIC_API_KEY` — la clé de l'étape 1.
   - `CLAUDE_OCR_MODEL` — facultatif. Par défaut `claude-haiku-5-5` (rapide,
     environ 0,0005 $ la feuille). Si les feuilles écrites à la main sont mal
     lues, poser `claude-sonnet-5-5` (environ 0,01 $ la feuille) — sans
     redéployer.
3. **Déploiement** (CLI Supabase, depuis `fitness-app/`) :
   ```
   supabase functions deploy ocr-import
   ```

Sans `ANTHROPIC_API_KEY`, la fonction répond 500 et l'écran d'import affiche
l'erreur avec un bouton « Réessayer » — pas de comportement silencieux.

## Ce que fait l'import

- **Un appel par image**, en séquence. Le SDK d'Anthropic reprend lui-même
  les erreurs 429 et 5xx (jusqu'à 4 tentatives, attente croissante) — attendu
  quand on avale six ans de feuilles d'un coup.
- **Comptage** : chaque exercice est compté (`occurrences` : combien de fois
  il revient sur la feuille), puis fusionné s'il revient dans plusieurs
  fichiers.
- **Doublons** : `src/lib/textSimilarity.ts` normalise les noms (accents,
  casse, ponctuation). Un nom identique ou très proche d'un exercice existant
  est **relié** à cet exercice au lieu d'être recréé ; une case permet de le
  créer quand même s'il s'agit d'un autre mouvement.
- **Mentions** : chaque exercice trouvé est enregistré dans
  `exercise_mentions` (migration 050). Additionnées sur tous les centres, elles
  donnent la liste « Vidéos à tourner en priorité » de l'admin.
- **Relecture** : chaque nom est affiché et modifiable avant l'enregistrement ;
  un exercice mal lu se corrige sur place.

## Limites en vigueur

Côté fonction : ~25 Mo par image encodée en base64, 4 tentatives par image,
JPEG, PNG, GIF, WEBP ou PDF. Côté client : 60 pages par PDF — au-delà, c'est
probablement le mauvais fichier plutôt qu'une vraie feuille d'entraînement.
