# Badges WODBUD — collection « Forge »

20 badges vectoriels (SVG) générés par un seul système visuel, avec exports PNG
transparents. Planche de présentation : `design/badges/planche.html` (autonome)
et `design/badges/planche.png`.

## 1. Les trois directions explorées

| | A. Forge (retenue) | B. Néon tactique | C. Podium olympique |
|---|---|---|---|
| Matériaux | Acier brossé, titane, or poli, or blanc, émail, obsidienne, gemmes taillées | Verre fumé, carbone, filets lumineux | Émail plat, métal satiné, ruban |
| Formes | Silhouettes sculptées propres à chaque badge, rebord biseauté | Hexagones et écussons techniques, coins coupés | Médailles rondes, rubans |
| Palette | Graphite + métal ; couleur portée par l'émail selon la rareté | Noir, cyan, magenta électriques | Or, argent, bronze, couleurs de drapeau |
| Lumière | Source unique en haut à gauche, reflets métalliques, halo par rareté | Lueurs émissives, lignes néon | Douce, presque plate |
| Ressenti | Récompense précieuse, forgée, méritée | Esport, futuriste | Classique, sportif, institutionnel |

**Recommandation : A. Forge.** C'est la seule qui rende la rareté *physique*
(rebords doublés, gemmes, ornements, halo) au lieu de la confier à la seule
couleur ; elle reste lisible à 24 px parce que chaque badge a une silhouette
pleine et un symbole massif ; et ses matériaux sombres s'accordent avec
l'interface de WODBUD (noir chaud, orange) sans la copier. B vieillit vite et
fatigue sur fond clair ; C ressemble à des médailles de course génériques.

## 2. Système visuel commun

- **Canevas** 256 × 256, composition centrée, marge de sécurité de 14 px.
- **Lumière** toujours en haut à gauche : reflet elliptique sur la face, biseau
  clair en haut et sombre en bas du rebord, ombre portée du symbole vers le bas
  à droite.
- **Arête sombre** de 3 px autour de chaque silhouette : le badge se détache
  sur fond sombre comme sur fond clair.
- **Symbole** toujours en métal massif (argent, or ou or blanc), jamais en
  trait fin : rien ne disparaît en petit.
- **Aucun texte** dans les illustrations.

## 3. Rareté — ce qui change, au-delà de la couleur

| Rareté | Construction | Matériaux | Effets |
|---|---|---|---|
| Commun | Rebord simple | Acier, face graphite, symbole argent | Aucun |
| Rare | Rebord simple + liseré d'émail + 1 gemme | Acier, émail bleu (cyan, indigo selon le thème) | Aucun |
| Épique | Double rebord + face en retrait + gemmes | Titane et acier, émail violet (rouge pour Puissance), symbole or | Halo coloré |
| Légendaire | Double rebord + ornements (lauriers, lames, couronne de dents) | Or poli et bronze, obsidienne, rubis | Halo doré + rayons |
| Mythique | Triple profondeur + ornements + couronne de rayons | Or blanc, or, face « cosmos », diamant, symbole prismatique | Halo cyan + 24 rayons |

Couleurs symboliques : bleu = régularité et méthode, cyan = matin et records
(air, sommet), indigo = nuit, violet = effort soutenu, rouge = intensité,
or = accomplissement, prisme = l'exceptionnel.

## 4. Nomenclature

| # | Badge | Catégorie | Rareté | Critère (proposé) | Fichiers |
|---|---|---|---|---|---|
| 01 | Premier pas | Régularité | Commun | Terminer sa première séance. | `public/badges/premier-pas.svg` · `design/badges/png/premier-pas@512.png` |
| 02 | Habitude | Régularité | Commun | Terminer 5 séances. | `public/badges/habitude.svg` · `design/badges/png/habitude@512.png` |
| 03 | Discipline | Régularité | Rare | Terminer 10 séances. | `public/badges/discipline.svg` · `design/badges/png/discipline@512.png` |
| 04 | Dévouement | Régularité | Épique | Terminer 30 séances. | `public/badges/devouement.svg` · `design/badges/png/devouement@512.png` |
| 05 | Machine | Régularité | Légendaire | Terminer 100 séances. | `public/badges/machine.svg` · `design/badges/png/machine@512.png` |
| 06 | Première série | Séries et records | Commun | Effectuer sa première série d’exercices. | `public/badges/premiere-serie.svg` · `design/badges/png/premiere-serie@512.png` |
| 07 | Persévérance | Séries et records | Épique | Effectuer 100 séries. | `public/badges/perseverance.svg` · `design/badges/png/perseverance@512.png` |
| 08 | Volume | Séries et records | Épique | Effectuer 500 séries. | `public/badges/volume.svg` · `design/badges/png/volume@512.png` |
| 09 | Record personnel | Séries et records | Rare | Battre un record personnel. | `public/badges/record-personnel.svg` · `design/badges/png/record-personnel@512.png` |
| 10 | Dépassement | Séries et records | Légendaire | Battre 10 records personnels. | `public/badges/depassement.svg` · `design/badges/png/depassement@512.png` |
| 11 | Éveil | Progression | Commun | Commencer son parcours d’entraînement. | `public/badges/eveil.svg` · `design/badges/png/eveil@512.png` |
| 12 | Évolution | Progression | Épique | Progresser pendant plusieurs semaines. | `public/badges/evolution.svg` · `design/badges/png/evolution@512.png` |
| 13 | Puissance | Progression | Épique | Atteindre un objectif de performance. | `public/badges/puissance.svg` · `design/badges/png/puissance@512.png` |
| 14 | Constance | Progression | Rare | S’entraîner plusieurs semaines consécutives. | `public/badges/constance.svg` · `design/badges/png/constance@512.png` |
| 15 | Transformation | Progression | Légendaire | Atteindre un objectif important de progression. | `public/badges/transformation.svg` · `design/badges/png/transformation@512.png` |
| 16 | Lève-tôt | Défis | Rare | Terminer une séance tôt le matin. | `public/badges/leve-tot.svg` · `design/badges/png/leve-tot@512.png` |
| 17 | Nocturne | Défis | Rare | Terminer une séance tard le soir. | `public/badges/nocturne.svg` · `design/badges/png/nocturne@512.png` |
| 18 | Sans relâche | Défis | Épique | Atteindre un objectif hebdomadaire exigeant. | `public/badges/sans-relache.svg` · `design/badges/png/sans-relache@512.png` |
| 19 | Invincible | Défis | Mythique | Maintenir une longue série de jours d’entraînement. | `public/badges/invincible.svg` · `design/badges/png/invincible@512.png` |
| 20 | Légende | Défis | Mythique | Accomplir un défi particulièrement difficile. | `public/badges/legende.svg` · `design/badges/png/legende@512.png` |

Chaque PNG existe aussi en 128 px (`@128.png`). Les données sont reprises dans
`public/badges/manifest.json` (nom, catégorie, rareté, critère, fichier).

## 5. Silhouettes et symboles

| Badge | Silhouette | Symbole |
|---|---|---|
| Premier pas | Médaillon rond | Marche franchie par une flèche |
| Habitude | Rosace à cinq lobes | Anneau de 5 segments autour d'un noyau |
| Discipline | Octogone | Fronton à colonnes |
| Dévouement | Rosette à 12 pointes | Flamme taillée, cœur en améthyste |
| Machine | Engrenage à 10 dents | Écrou hexagonal, noyau rubis |
| Première série | Hexagone | Barre chargée |
| Persévérance | Insigne pointe en bas | Trois chevrons de grade |
| Volume | Carré arrondi | Pile de disques |
| Record personnel | Pignon pointe en haut | Sommet et drapeau |
| Dépassement | Médaillon + lauriers | Flèche qui brise la barre |
| Éveil | Rose des vents à 4 pointes | Étincelle |
| Évolution | Losange | Barres ascendantes |
| Puissance | Écu anguleux | Éclair |
| Constance | Triangle | Cycle de deux flèches |
| Transformation | Hexagone + lames | Cristal facetté |
| Lève-tôt | Dôme | Soleil levant sur l'horizon |
| Nocturne | Amande verticale | Croissant et étoile |
| Sans relâche | Étoile à 6 branches | Cible et flèche |
| Invincible | Écu couronné | Diamant brillant prismatique |
| Légende | Étoile à 8 branches + lauriers | Couronne sertie |

## 6. Prêts pour l'animation

Chaque SVG est découpé en calques nommés :
`#<slug>-aura`, `-ornament`, `-rim`, `-face`, `-glyph`, `-sheen`, `-gems`.
Un déblocage peut animer chacun séparément : halo qui pulse, reflet qui
balaie la face (`-sheen`), symbole qui apparaît en échelle, gemmes qui
scintillent, particules par-dessus.

## 7. Régénérer

```bash
node scripts/badges/build-badges.mjs   # SVG + manifest
node scripts/badges/build-board.mjs    # planche HTML
```

Les PNG et la planche PNG sont des captures des SVG (navigateur, fond
transparent) ; à refaire après toute modification.

## 8. Intégration dans l'app (migration 046)

Fusion avec le catalogue existant : les 34 badges en base sont conservés
(ainsi que ceux déjà gagnés) et reçoivent chacun un visuel ; 22 visuels
complémentaires ont été dessinés dans le même système pour ceux que la
collection ne couvrait pas (cardio, équipements, votes, communauté, coach).
8 badges mesurables sont ajoutés : `wod_5`, `wod_30`, `early_1`, `late_1`,
`week_5`, `result_1`, `pr_10`, `results_50` ; `pr` devient atteignable.

La rareté suit la vraie difficulté : Évolution (30 jours d'affilée) et
Persévérance (50 séances) passent d'« Rare » à « Épique ».

Côté base : colonnes `badges.art` (nom du visuel) et `badges.rarity`.
Côté app : `BadgeToken` affiche `/badges/<art>.svg` (gris + cadenas tant que
le badge est verrouillé, apparition et reflet au déblocage).

| Clé(s) en base | Visuel | Rareté | Fichier |
|---|---|---|---|
| `first_wod` | Premier pas | Commun | `public/badges/premier-pas.svg` |
| `wod_5` | Habitude | Commun | `public/badges/habitude.svg` |
| `wod_10` | Discipline | Rare | `public/badges/discipline.svg` |
| `wod_30` | Dévouement | Épique | `public/badges/devouement.svg` |
| `wod_100` | Machine | Légendaire | `public/badges/machine.svg` |
| `result_1` | Première série | Commun | `public/badges/premiere-serie.svg` |
| `wod_50` | Persévérance | Épique | `public/badges/perseverance.svg` |
| `results_50` | Volume | Épique | `public/badges/volume.svg` |
| `pr` | Record personnel | Rare | `public/badges/record-personnel.svg` |
| `pr_10` | Dépassement | Légendaire | `public/badges/depassement.svg` |
| `streak_3` | Éveil | Commun | `public/badges/eveil.svg` |
| `streak_30` | Évolution | Épique | `public/badges/evolution.svg` |
| `long_90` | Puissance | Épique | `public/badges/puissance.svg` |
| `streak_7` | Constance | Rare | `public/badges/constance.svg` |
| `year_1` | Transformation | Légendaire | `public/badges/transformation.svg` |
| `early_1` | Lève-tôt | Rare | `public/badges/leve-tot.svg` |
| `late_1` | Nocturne | Rare | `public/badges/nocturne.svg` |
| `week_5` | Sans relâche | Épique | `public/badges/sans-relache.svg` |
| `streak_100` | Invincible | Mythique | `public/badges/invincible.svg` |
| `wod_250` | Légende | Mythique | `public/badges/legende.svg` |
| `long_45` | Le long format | Rare | `public/badges/chrono.svg` |
| `weekend` | Guerrier du week-end | Rare | `public/badges/week-end.svg` |
| `gear_3` | Polyvalent | Commun | `public/badges/polyvalent.svg` |
| `gear_all` | Touche-à-tout | Légendaire | `public/badges/arsenal.svg` |
| `cardio_1` | Premier kilomètre | Commun | `public/badges/souffle.svg` |
| `cardio_20` | Souffle long | Rare | `public/badges/souffle-long.svg` |
| `vote_1` | Voix du groupe | Commun | `public/badges/urne.svg` |
| `rank_shared` | Ambassadeur | Commun | `public/badges/porte-voix.svg` |
| `vote_25` | Électeur fidèle | Rare | `public/badges/bulletin.svg` |
| `vote_50` | Pilier du scrutin | Épique | `public/badges/pilier.svg` |
| `multi_class_voter` | Voix partout | Rare | `public/badges/voix-partout.svg` |
| `joined` | Membre | Commun | `public/badges/membre.svg` |
| `class_veteran` | Vétéran | Épique | `public/badges/veteran.svg` |
| `multi_class` | Multi-boîtes | Rare | `public/badges/multi-boites.svg` |
| `community_challenge` | Défi relevé | Épique | `public/badges/defi.svg` |
| `community_wod_10` | Fidèle de la commu | Rare | `public/badges/fidele.svg` |
| `year_2` | Deux ans | Légendaire | `public/badges/deux-ans.svg` |
| `coach_class` | Ouvre-boîte | Commun | `public/badges/sifflet.svg` |
| `coach_10wod` | Architecte | Rare | `public/badges/architecte.svg` |
| `coach_vote` | Démocratie | Rare | `public/badges/tribune.svg` |
| `coach_20` | Plein la box | Épique | `public/badges/plein-la-box.svg` |
| `attendance` | Présent | Rare | `public/badges/presence.svg` |
