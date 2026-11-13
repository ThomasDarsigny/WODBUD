# Tests

## Unitaires (Vitest)

```bash
npm test
```

Les calculs sans réseau : scores, semaines et cycles, horaire, présences, menu, accueil coach… Fichiers `src/**/*.test.ts`.

## De bout en bout (Playwright)

```bash
npm run test:e2e
```

Dix-sept fichiers de parcours, chacun lancé sur ordinateur (1440 × 900) et sur téléphone (Pixel 7) :

| Fichier | Parcours |
|---|---|
| `e2e/coach-home.e2e.ts` | Connexion, puis l'accueil coach : la salle du jour, « À faire », le menu à cinq entrées |
| `e2e/create-wod.e2e.ts` | Créer un WOD dans le créateur et l'enregistrer ; alerte « repos 48 h » ; fiche d'exercice fermée par Échap |
| `e2e/planning.e2e.ts` | Programmer un jour de la semaine d'un cours, puis un cycle de deux semaines ; retirer une séance depuis la liste |
| `e2e/attendance.e2e.ts` | Présences : scan du QR, QR expiré, « Je suis là », scan sans être connecté puis connexion |
| `e2e/tv-whiteboard.e2e.ts` | Mode TV (WOD, QR, arrivées, tableau blanc) et réaction sur le tableau blanc |
| `e2e/classes.e2e.ts` | Créer un cours depuis sa fenêtre |
| `e2e/settings.e2e.ts` | Changer son nom ; la suppression du compte reste verrouillée tant que le mot n'est pas tapé |
| `e2e/vote.e2e.ts` | L'athlète change son vote et l'enregistre |
| `e2e/join.e2e.ts` | Lien d'invitation : connexion puis cours rejoint ; lien invalide |
| `e2e/exercises.e2e.ts` | Formulaire d'exercice (champs étiquetés, Échap) ; confirmation avant de supprimer |
| `e2e/communities.e2e.ts` | Créer une communauté ; défi (progression annoncée, suppression) ; profil d'un membre (rang, Échap) |
| `e2e/public.e2e.ts` | Connexion refusée (message traduit), inscription (mots de passe différents, courriel de confirmation, renvoi limité), rang partagé |
| `e2e/coach-votes.e2e.ts` | Fermer un vote, supprimer un vote (en deux temps) ; choisir une thématique ; l'admin en propose une au clavier |
| `e2e/menus.e2e.ts` | Barre latérale (ordinateur) : replier et déplier, page courante annoncée, chez le coach et chez l'athlète |
| `e2e/journal.e2e.ts` | Journal : programmer une séance au clavier, retirer une séance (en deux temps) |
| `e2e/rank.e2e.ts` | Rang lisible en thème clair ; classement d'un cours (liste ordonnée, changer de période) |
| `e2e/contrast.e2e.ts` | Garde-fou de contraste : chaque texte de 20 écrans, en thème clair et sombre, atteint 4,5:1 (3:1 en grand) ; aide `e2e/contrast.ts` |

**Rien ne sort de la machine.** L'app est servie sur le port 5174 avec une fausse adresse Supabase (`http://supabase.test`). `e2e/supabase-mock.ts` intercepte chaque requête et répond comme PostgREST, à partir d'une petite base en mémoire. Il gère les filtres `eq`, `in`, `gte`…, le tri, les lignes uniques, les comptes, les écritures, les fonctions RPC et la connexion. Chaque test vérifie ensuite ce qui a été écrit (`db.writesTo('class_plans', 'POST')`). Côté authentification, `db.authCalls` garde chaque appel (connexion, inscription, renvoi) et `db.authErrors` fait répondre une erreur GoTrue à un chemin donné (`invalid_credentials`, `over_email_send_rate_limit`…). Le dépôt est public : aucun identifiant réel n'est utilisé.

**Heure figée.** Les tests se déroulent le mercredi 18 novembre 2026 à 5 h 45, un quart d'heure avant le cours de 6 h. Les données (`e2e/fixtures.ts`) sont fictives : un coach, le cours « CrossFit 6h » (lundi, mercredi et vendredi à 6 h), trois athlètes, et Fran au programme du jour.

**Navigateur.** Les tests utilisent Chrome tel qu'il est installé sur la machine (`channel: 'chrome'`), donc aucun navigateur à télécharger. Sur GitHub, le job « Parcours de bout en bout » du workflow CI les lance à chaque push sur `main` ou `dev`. En cas d'échec, le rapport (captures et traces) est joint au run.

**Ajouter un parcours.** Partir de `coachDb()` ou `athleteDb()`, compléter les tables au besoin, appeler `await db.install(page)` avant la première navigation, puis vérifier l'écran et `db.writes` / `db.calls`. Toute erreur JavaScript dans la page fait échouer le test.
