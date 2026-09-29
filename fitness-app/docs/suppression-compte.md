# Suppression de compte

N'importe quel compte (coach ou athlète) peut se supprimer lui-même depuis
Paramètres → Zone de danger, sans passer par un admin. La fonction Edge
`supabase/functions/delete-account` fait le travail réel.

## Pourquoi une seule opération suffit

`profiles.id` référence `auth.users(id) on delete cascade`, et toutes les
tables qui comptent référencent `profiles` (ou directement `auth.users`,
pour `scheduled_workouts` et `user_badges`) avec la même règle. Supprimer la
ligne `auth.users` — via `admin.deleteUser(id, false)`, un vrai `DELETE`, pas
un bannissement — suffit donc à tout effacer en cascade :

| Table | Cascade depuis |
|---|---|
| `workouts`, `workout_sessions`, `exercise_votes`, `rank_shares`, `class_members`, `classes`, `vote_sessions`, `admin_users` | `profiles` |
| `scheduled_workouts`, `user_badges` | `auth.users` directement |
| `exercises.created_by`, `themes.created_by` | **`SET NULL`**, volontairement — la bibliothèque d'exercices est une ressource partagée, elle ne doit pas disparaître avec son créateur |

Aucune table à supprimer une par une dans le bon ordre : c'est justement ce
genre de liste, tenue à la main, qui devient fausse au premier ajout de
table oublié. Si une nouvelle table doit être liée à un utilisateur, lui
donner la bonne règle de suppression (`cascade` pour des données
personnelles, `set null` pour une ressource partagée) suffit à la tenir à
jour ici sans y toucher.

## Le vrai problème : un coach n'est pas seul sur son compte

`classes.coach_id → profiles` est en `cascade`, et `class_members.class_id
→ classes` l'est aussi. Un coach qui se supprime supprime donc ses classes,
ce qui **retire ses athlètes de ces classes et efface leurs votes qui s'y
rattachaient** — des données qui ne lui appartiennent pas.

C'est le seul cas où « supprimer mon compte » a un effet sur quelqu'un
d'autre. La fonction ne le cache pas : avant de supprimer quoi que ce soit,
un premier appel (`{ confirm: false }`) calcule combien d'athlètes seraient
touchés, et l'écran l'affiche en rouge, séparé du reste du résumé. Un
athlète qui se supprime lui-même n'a jamais cet avertissement — ses propres
données ne touchent que lui.

Aucune fonctionnalité de transfert de classe n'existe aujourd'hui. Si un
coach veut partir sans couper ses athlètes, il n'y a pas d'autre solution
que de le faire manuellement avant de supprimer le compte.

## Garde-fou admin

Un compte admin ne peut pas se supprimer lui-même — la fonction refuse avec
une erreur explicite. L'app n'a aucune interface pour désigner un nouvel
admin ; laisser un admin partir retirerait à tout le monde la capacité de
créer ou modifier un exercice (migrations 022-023). Au moment d'écrire ceci,
il n'y a qu'un seul admin sur le projet — perdre ce compte serait donc total,
pas partiel.

## Les deux appels

- `{ confirm: false }` (ou le corps omis) : calcule et renvoie l'ampleur
  (classes, athlètes, workouts, séances, sessions de vote), sans rien
  supprimer.
- `{ confirm: true }` : supprime réellement.

Le client (`SettingsView.tsx`) affiche toujours le premier avant de
permettre le second, et exige de retaper un mot de confirmation
(`settings.delete_confirm_word`) avant d'activer le bouton final — une case
à cocher se clique par réflexe, retaper un mot ralentit assez pour qu'un
clic distrait ne suffise pas sur une action qu'aucun « annuler » ne peut
défaire.

## Photo de profil

Migration 027, dans le même fichier que la colonne `avatar_url` : bucket
Supabase Storage `avatars`, public en lecture, écriture restreinte au
propriétaire via le chemin `avatars/<user_id>/photo.<ext>`. Voir le
commentaire en tête de la migration pour le choix Storage plutôt que R2
(pas le même volume, pas le même calcul d'egress que les vidéos
d'exercices — voir `docs/stockage-video-r2.md`).
