-- Catalogue des 26 badges retenus. Textes en base, comme pour `ranks` :
-- ajouter un badge est une ligne SQL, pas un déploiement.
insert into public.badges
  (key, position, family, display_fr, display_en, display_es,
   condition_fr, condition_en, condition_es, icon, threshold, available)
values
  -- ── Assiduité ──────────────────────────────────────────────────
  ('streak_3',   10, 'assiduite', 'Première étincelle', 'First Spark',  'Primera chispa',
   '3 jours d''affilée', '3 days in a row', '3 días seguidos', 'flame', 3, true),
  ('streak_7',   20, 'assiduite', 'Semaine pleine',     'Full Week',    'Semana completa',
   '7 jours d''affilée', '7 days in a row', '7 días seguidos', 'flame', 7, true),
  ('streak_30',  30, 'assiduite', 'Le mois',            'The Month',    'El mes',
   '30 jours d''affilée', '30 days in a row', '30 días seguidos', 'calendar', 30, true),
  ('streak_100', 40, 'assiduite', 'Cent jours',         'Hundred Days', 'Cien días',
   '100 jours d''affilée', '100 days in a row', '100 días seguidos', 'calendar', 100, true),

  -- ── Volume ─────────────────────────────────────────────────────
  ('first_wod',  50, 'volume', 'Premier WOD',    'First WOD',     'Primer WOD',
   'Terminer une première séance', 'Finish your first session', 'Termina tu primera sesión', 'bolt', 1, true),
  ('wod_10',     60, 'volume', 'Dix au compteur','Ten Down',      'Diez en el marcador',
   '10 séances terminées', '10 sessions completed', '10 sesiones completadas', 'dumbbell', 10, true),
  ('wod_50',     70, 'volume', 'Cinquante',      'Fifty',         'Cincuenta',
   '50 séances terminées', '50 sessions completed', '50 sesiones completadas', 'dumbbell', 50, true),
  ('wod_100',    80, 'volume', 'Centenaire',     'Centurion',     'Centenario',
   '100 séances terminées', '100 sessions completed', '100 sesiones completadas', 'medal', 100, true),
  ('wod_250',    90, 'volume', 'Deux cent cinquante', 'Two Fifty', 'Doscientos cincuenta',
   '250 séances terminées', '250 sessions completed', '250 sesiones completadas', 'medal', 250, true),

  -- ── Endurance (sur UNE séance — les rangs mesurent déjà le cumul) ─
  ('long_45',   100, 'endurance', 'Le long format', 'Long Format', 'Formato largo',
   'Une séance de 45 minutes ou plus', 'A single session of 45 minutes or more',
   'Una sesión de 45 minutos o más', 'clock', 45, true),
  ('long_90',   110, 'endurance', 'Hero WOD',       'Hero WOD',    'Hero WOD',
   'Une séance de 90 minutes ou plus', 'A single session of 90 minutes or more',
   'Una sesión de 90 minutos o más', 'clock', 90, true),

  -- ── Horaires ───────────────────────────────────────────────────
  ('weekend',   120, 'horaires', 'Guerrier du week-end', 'Weekend Warrior', 'Guerrero de fin de semana',
   '10 séances un samedi ou un dimanche', '10 sessions on a Saturday or Sunday',
   '10 sesiones en sábado o domingo', 'calendar', 10, true),

  -- ── Variété ────────────────────────────────────────────────────
  ('gear_3',    130, 'variete', 'Polyvalent',    'Versatile',    'Polivalente',
   'S''entraîner avec 3 agrès différents', 'Train with 3 different pieces of gear',
   'Entrena con 3 equipos diferentes', 'grid', 3, true),
  ('gear_all',  140, 'variete', 'Touche-à-tout', 'Jack of All',  'Todoterreno',
   'Avoir touché les 10 agrès', 'Use all 10 pieces of gear', 'Usa los 10 equipos', 'grid', 10, true),
  ('cardio_1',  150, 'variete', 'Premier kilomètre', 'First Mile', 'Primer kilómetro',
   'Consigner une première activité cardio', 'Log your first cardio activity',
   'Registra tu primera actividad de cardio', 'heart', 1, true),
  ('cardio_20', 160, 'variete', 'Souffle long',  'Long Wind',    'Aliento largo',
   '20 activités cardio consignées', '20 cardio activities logged',
   '20 actividades de cardio registradas', 'heart', 20, true),

  -- ── Communauté ─────────────────────────────────────────────────
  ('vote_1',    170, 'communaute', 'Voix du groupe',  'A Voice',      'Voz del grupo',
   'Voter pour la première fois', 'Vote for the first time', 'Vota por primera vez', 'vote', 1, true),
  ('vote_25',   180, 'communaute', 'Électeur fidèle', 'Loyal Voter',  'Votante fiel',
   '25 votes déposés', '25 votes cast', '25 votos emitidos', 'vote', 25, true),
  ('joined',    190, 'communaute', 'Membre',          'Member',       'Miembro',
   'Rejoindre un cours', 'Join a class', 'Únete a una clase', 'users', 1, true),
  ('year_1',    200, 'communaute', 'Un an',           'One Year',     'Un año',
   '365 jours depuis l''inscription', '365 days since signing up',
   '365 días desde el registro', 'star', 365, true),

  -- ── Côté coach ─────────────────────────────────────────────────
  ('coach_class',  210, 'coach', 'Ouvre-boîte',  'Box Opener',  'Abre-box',
   'Créer un premier cours', 'Create your first class', 'Crea tu primera clase', 'users', 1, true),
  ('coach_10wod',  220, 'coach', 'Architecte',   'Architect',   'Arquitecto',
   'Créer 10 workouts', 'Create 10 workouts', 'Crea 10 workouts', 'workout', 10, true),
  ('coach_vote',   230, 'coach', 'Démocratie',   'Democracy',   'Democracia',
   'Lancer 10 votes', 'Run 10 votes', 'Lanza 10 votaciones', 'vote', 10, true),
  ('coach_20',     240, 'coach', 'Plein la box', 'Full House',  'Box llena',
   '20 athlètes inscrits à tes cours', '20 athletes enrolled in your classes',
   '20 atletas inscritos en tus clases', 'users', 20, true),

  -- ── Retenus mais pas encore décernables ────────────────────────
  -- available = false : l'app les montre « à venir », pas « verrouillé ».
  -- Rien dans le schéma ne mesure encore ces deux-là.
  ('pr',         250, 'suivi', 'Record personnel', 'Personal Record', 'Récord personal',
   'Battre sa charge maximale sur un mouvement', 'Beat your max load on a movement',
   'Supera tu carga máxima en un movimiento', 'medal', null, false),
  ('attendance', 260, 'suivi', 'Présent',          'Present',         'Presente',
   'Assister à 20 cours', 'Attend 20 classes', 'Asiste a 20 clases', 'calendar', 20, false)
on conflict (key) do update set
  position     = excluded.position,
  family       = excluded.family,
  display_fr   = excluded.display_fr,
  display_en   = excluded.display_en,
  display_es   = excluded.display_es,
  condition_fr = excluded.condition_fr,
  condition_en = excluded.condition_en,
  condition_es = excluded.condition_es,
  icon         = excluded.icon,
  threshold    = excluded.threshold,
  available    = excluded.available;
