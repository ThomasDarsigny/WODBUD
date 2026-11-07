# Sauvegardes et visite automatique de la base

Le fichier `.github/workflows/db-backup.yml` lance deux tâches chaque jour sur GitHub Actions :

| Tâche | Heure (Québec) | Rôle |
|---|---|---|
| **Visite** | ~8 h | Une requête à l'API Supabase, pour que le projet gratuit ne soit jamais mis en pause pour inactivité. |
| **Sauvegarde** | ~3 h | Export complet de la base (rôles, schéma, données), **chiffré en AES-256**, gardé 30 jours dans l'onglet *Actions* de GitHub. |

Le dépôt est **public** : n'importe quel compte GitHub peut télécharger les artefacts. C'est pour ça que la sauvegarde est chiffrée avant d'être gardée ; sans la phrase de passe, le fichier est illisible.

## 1. Créer les secrets (une seule fois)

GitHub → dépôt **WODBUD** → *Settings* → *Secrets and variables* → *Actions* → *New repository secret* :

| Nom | Valeur |
|---|---|
| `SUPABASE_URL` | `https://onyifpsvwprviuhnomxg.supabase.co` |
| `SUPABASE_ANON_KEY` | La clé publique *anon* (la même que `VITE_SUPABASE_ANON_KEY` dans Vercel). |
| `SUPABASE_DB_URL` | Supabase → bouton **Connect** → **Session pooler** → l'URI, avec ton mot de passe de base de données à la place de `[YOUR-PASSWORD]`. Prends bien le *Session pooler* : les machines de GitHub n'ont pas d'IPv6, la connexion directe échouerait. |
| `BACKUP_PASSPHRASE` | Une longue phrase de passe que tu inventes (30 caractères ou plus). **Garde-la dans ton gestionnaire de mots de passe** : sans elle, aucune sauvegarde ne peut être ouverte. |

## 2. Tester

GitHub → *Actions* → **Base de données — sauvegarde et visite** → *Run workflow*. Les deux tâches doivent finir en vert ; la sauvegarde apparaît en bas de la page du run, dans *Artifacts* (`wodbud-db-AAAA-MM-JJ`).

## 3. Restaurer

1. Télécharger l'artefact (un `.zip` contenant `wodbud-db-AAAA-MM-JJ.tgz.gpg`) et le décompresser.
2. Déchiffrer puis ouvrir l'archive :

   ```bash
   gpg -d wodbud-db-AAAA-MM-JJ.tgz.gpg > backup.tgz
   ```

   ```bash
   tar -xzf backup.tgz
   ```

3. Restaurer dans un projet Supabase **neuf** (jamais par-dessus la production en marche), avec l'URI *Session pooler* de ce nouveau projet :

   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 --file roles.sql --file schema.sql --command 'SET session_replication_role = replica' --file data.sql --dbname "URI_DU_NOUVEAU_PROJET"
   ```

## Limites à connaître

- **Fichiers non inclus** : les photos de profil et les médias de référence (Supabase Storage) ne sont pas dans l'export, seulement la base.
- **60 jours sans activité** : sur un dépôt public, GitHub désactive les tâches planifiées si aucun commit n'a été poussé depuis 60 jours. GitHub envoie un courriel avant ; il suffit de réactiver le workflow dans l'onglet *Actions*.
- **30 jours d'historique** : au-delà, les sauvegardes sont effacées automatiquement.
