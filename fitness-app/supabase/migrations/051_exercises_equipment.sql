-- 051 — Équipement requis des exercices de la base commune.
--
-- Seulement ce qui est indispensable pour faire l'exercice : le filtre du
-- créateur de WOD s'en sert pour proposer d'abord ce qui est faisable. Quand
-- plusieurs équipements conviennent (ex. marche du fermier), on indique le
-- plus courant. `bodyweight` = aucun matériel ; une liste vide veut dire « pas
-- renseigné » (exercices importés).
--
-- Ne touche que les exercices sans équipement : une correction faite à la
-- main ne serait pas écrasée.

update public.exercises e
   set equipment = v.equipment
  from (values
    ('Arraché (snatch)', array['barbell', 'plates']),
    ('Back squat', array['barbell', 'plates', 'rack']),
    ('Box jump', array['box']),
    ('Corde à sauter (double-unders)', array['jump_rope']),
    ('Curl biceps', array['dumbbells']),
    ('Développé couché', array['barbell', 'plates', 'bench']),
    ('Développé militaire', array['barbell', 'plates']),
    ('Dips (répulsions)', array['parallel_bars']),
    ('Élévation latérale', array['dumbbells']),
    ('Épaulé (clean)', array['barbell', 'plates']),
    ('Extension triceps', array['dumbbells']),
    ('Face pull élastique', array['bands']),
    ('Front rack carry', array['kettlebells']),
    ('Front squat', array['barbell', 'plates', 'rack']),
    ('Goblet squat', array['kettlebells']),
    ('Good morning', array['barbell', 'plates']),
    ('Haussement d''épaules (shrug)', array['dumbbells']),
    ('Hip thrust', array['barbell', 'plates', 'bench']),
    ('Kettlebell swing', array['kettlebells']),
    ('Maintien aux anneaux', array['rings']),
    ('Marche du fermier', array['dumbbells']),
    ('Montée de corde', array['climb_rope']),
    ('Muscle-up', array['rings']),
    ('Overhead carry', array['dumbbells']),
    ('Pallof press', array['bands']),
    ('Planche de Copenhague', array['bench']),
    ('Push press', array['barbell', 'plates']),
    ('Rameur', array['rower']),
    ('Rowing anneaux', array['rings']),
    ('Rowing barre', array['barbell', 'plates']),
    ('Sandbag bear hug carry', array['sandbag']),
    ('Sandbag clean', array['sandbag']),
    ('Slam ball', array['medicine_ball']),
    ('Soulevé de terre', array['barbell', 'plates']),
    ('Soulevé de terre roumain', array['barbell', 'plates']),
    ('Split squat bulgare', array['bench']),
    ('Squat sumo', array['kettlebells']),
    ('Step-up', array['box']),
    ('Suitcase carry', array['kettlebells']),
    ('Thruster', array['barbell', 'plates']),
    ('Toes-to-bar', array['pullup_bar']),
    ('Traction (pull-up)', array['pullup_bar']),
    ('Traction supination (chin-up)', array['pullup_bar']),
    ('Wall ball', array['wall_ball']),
    ('Air squat', array['bodyweight']),
    ('Bird dog', array['bodyweight']),
    ('Burpee', array['bodyweight']),
    ('Course à pied', array['bodyweight']),
    ('Extension mollets', array['bodyweight']),
    ('Extension tibiale', array['bodyweight']),
    ('Fente (lunge)', array['bodyweight']),
    ('Handstand push-up', array['bodyweight']),
    ('Hollow hold', array['bodyweight']),
    ('Planche', array['bodyweight']),
    ('Planche latérale', array['bodyweight']),
    ('Pompe (push-up)', array['bodyweight']),
    ('Redressement assis (sit-up)', array['bodyweight']),
    ('Russian twist', array['bodyweight']),
    ('Squat cosaque', array['bodyweight']),
    ('Superman (extension lombaire)', array['bodyweight'])
  ) as v(name, equipment)
 where e.name = v.name
   and e.center_id is null
   and e.equipment = '{}';
