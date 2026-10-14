


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."classes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "schedule" "text",
    "coach_id" "uuid" NOT NULL,
    "invite_token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(8), 'hex'::"text") NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."classes" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_by_invite_token"("p_token" "text") RETURNS SETOF "public"."classes"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.classes WHERE invite_token = p_token LIMIT 1;
$$;


ALTER FUNCTION "public"."get_class_by_invite_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_class_leaderboard_since"("p_class_id" "uuid", "p_since" timestamp with time zone) RETURNS TABLE("athlete_id" "uuid", "full_name" "text", "minutes" integer, "current_streak" integer, "longest_streak" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select cm.athlete_id,
         p.full_name,
         coalesce((
           select sum(ws.active_minutes)
           from public.workout_sessions ws
           where ws.user_id = cm.athlete_id
             and ws.performed_at >= p_since
         ), 0)::integer,
         coalesce(p.current_streak, 0)::integer,
         coalesce(p.longest_streak, 0)::integer
  from public.class_members cm
  join public.profiles p on p.id = cm.athlete_id
  where cm.class_id = p_class_id
    and p_since >= now() - interval '32 days'
    and (public.is_class_member(p_class_id) or public.is_class_coach(p_class_id) or public.is_admin());
$$;


ALTER FUNCTION "public"."get_class_leaderboard_since"("p_class_id" "uuid", "p_since" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_shared_rank"("p_token" "text") RETURNS TABLE("display_name" "text", "rank_key" "text", "total_minutes" integer, "current_streak" integer, "avatar_url" "text", "social_links" "jsonb")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(p.full_name, 'Athlète WODBUD'),
         public.wodbud_rank_for_minutes(p.total_minutes),
         p.total_minutes,
         p.current_streak,
         p.avatar_url,
         p.social_links
  from public.rank_shares rs
  join public.profiles p on p.id = rs.user_id
  where rs.token = p_token and rs.revoked_at is null;
$$;


ALTER FUNCTION "public"."get_shared_rank"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_authored"("p_uid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.admin_users where user_id = p_uid
  );
$$;


ALTER FUNCTION "public"."is_admin_authored"("p_uid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_coach"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.coach_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_class_coach"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_class_member"("p_class_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.class_members cm
    where cm.class_id = p_class_id
      and cm.athlete_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_class_member"("p_class_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_class_membership_plans"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select new.athlete_id, cp.workout_id,
           coalesce(cp.title, (select w.title from workouts w where w.id = cp.workout_id)),
           cp.notes, cp.scheduled_date, cp.id
    from class_plans cp
    where cp.class_id = new.class_id and cp.scheduled_date >= current_date
    on conflict do nothing;
    return new;
  else
    delete from scheduled_workouts sw
     using class_plans cp
     where sw.class_plan_id = cp.id
       and cp.class_id = old.class_id
       and sw.user_id = old.athlete_id
       and sw.session_id is null
       and sw.scheduled_date >= current_date;
    return old;
  end if;
end $$;


ALTER FUNCTION "public"."wodbud_class_membership_plans"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_class_plan_fanout"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  copy_title text := coalesce(new.title, (select w.title from workouts w where w.id = new.workout_id));
begin
  if tg_op = 'INSERT' then
    insert into scheduled_workouts (user_id, workout_id, title, notes, scheduled_date, class_plan_id)
    select cm.athlete_id, new.workout_id, copy_title, new.notes, new.scheduled_date, new.id
    from class_members cm
    where cm.class_id = new.class_id
    on conflict do nothing;
  elsif tg_op = 'UPDATE' then
    update scheduled_workouts
       set workout_id = new.workout_id, title = copy_title, notes = new.notes,
           scheduled_date = new.scheduled_date
     where class_plan_id = new.id;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."wodbud_class_plan_fanout"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_rank_for_minutes"("p_minutes" integer) RETURNS "text"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select key from public.ranks
  where min_minutes <= greatest(p_minutes, 0)
  order by min_minutes desc limit 1;
$$;


ALTER FUNCTION "public"."wodbud_rank_for_minutes"("p_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid" DEFAULT "auth"."uid"()) RETURNS SETOF "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  tz constant text := 'America/Toronto';

  v_sessions    integer;
  v_longest     integer;
  v_max_minutes integer;
  v_weekend     integer;
  v_gear        integer;
  v_cardio      integer;
  v_votes       integer;
  v_joined      boolean;
  v_age_days    integer;
  v_c_classes   integer;
  v_c_workouts  integer;
  v_c_votes     integer;
  v_c_athletes  integer;
  -- Ajouts communauté
  v_rank_shared        boolean;
  v_class_tenured       boolean;
  v_multi_class          integer;
  v_multi_class_voter    integer;
begin
  if p_user is null or (p_user <> auth.uid() and not public.is_admin()) then return; end if;

  select count(*) into v_sessions
    from workout_sessions where user_id = p_user;

  select coalesce(longest_streak, 0) into v_longest
    from profiles where id = p_user;

  select coalesce(max(coalesce(active_minutes, duration_minutes, 0)), 0)
    into v_max_minutes
    from workout_sessions where user_id = p_user;

  select count(*) into v_weekend
    from workout_sessions
   where user_id = p_user
     and extract(isodow from (performed_at at time zone tz)) in (6, 7);

  select count(distinct w.method) into v_gear
    from workout_sessions s
    join workouts w on w.id = s.workout_id
   where s.user_id = p_user and w.method is not null;

  select count(*) into v_cardio
    from workout_sessions
   where user_id = p_user and activity_exercise_id is not null;

  select count(*) into v_votes
    from exercise_votes where user_id = p_user;

  select exists (select 1 from class_members where athlete_id = p_user)
    into v_joined;

  select coalesce(extract(day from (now() - created_at))::integer, 0)
    into v_age_days
    from profiles where id = p_user;

  select count(*) into v_c_classes  from classes       where coach_id   = p_user;
  select count(*) into v_c_workouts from workouts      where created_by = p_user;
  select count(*) into v_c_votes    from vote_sessions where coach_id   = p_user;

  select count(distinct cm.athlete_id) into v_c_athletes
    from class_members cm
    join classes c on c.id = cm.class_id
   where c.coach_id = p_user;

  -- Partage de rang : un fait acquis, même si le lien a été révoqué depuis.
  select exists (select 1 from rank_shares where user_id = p_user)
    into v_rank_shared;

  select exists (
      select 1 from class_members
       where athlete_id = p_user and joined_at <= now() - interval '180 days'
    ) into v_class_tenured;

  select count(distinct class_id) into v_multi_class
    from class_members where athlete_id = p_user;

  select count(distinct vs.class_id) into v_multi_class_voter
    from exercise_votes ev
    join vote_sessions vs on vs.id = ev.vote_session_id
   where ev.user_id = p_user;

  return query
  with evaluated(key, earned) as (
    values
      ('streak_3',     v_longest     >= 3),
      ('streak_7',     v_longest     >= 7),
      ('streak_30',    v_longest     >= 30),
      ('streak_100',   v_longest     >= 100),
      ('first_wod',    v_sessions    >= 1),
      ('wod_10',       v_sessions    >= 10),
      ('wod_50',       v_sessions    >= 50),
      ('wod_100',      v_sessions    >= 100),
      ('wod_250',      v_sessions    >= 250),
      ('long_45',      v_max_minutes >= 45),
      ('long_90',      v_max_minutes >= 90),
      ('weekend',      v_weekend     >= 10),
      ('gear_3',       v_gear        >= 3),
      ('gear_all',     v_gear        >= 10),
      ('cardio_1',     v_cardio      >= 1),
      ('cardio_20',    v_cardio      >= 20),
      ('vote_1',       v_votes       >= 1),
      ('vote_25',      v_votes       >= 25),
      ('vote_50',      v_votes       >= 50),
      ('joined',       v_joined),
      ('year_1',       v_age_days    >= 365),
      ('year_2',       v_age_days    >= 730),
      ('coach_class',  v_c_classes   >= 1),
      ('coach_10wod',  v_c_workouts  >= 10),
      ('coach_vote',   v_c_votes     >= 10),
      ('coach_20',     v_c_athletes  >= 20),
      ('rank_shared',        v_rank_shared),
      ('class_veteran',      v_class_tenured),
      ('multi_class',        v_multi_class       >= 2),
      ('multi_class_voter',  v_multi_class_voter >= 3)
  ),
  inserted as (
    insert into user_badges (user_id, badge_key)
    select p_user, e.key
      from evaluated e
      join badges b on b.key = e.key and b.available
     where e.earned
    on conflict (user_id, badge_key) do nothing
    returning badge_key
  )
  select badge_key from inserted;
end;
$$;


ALTER FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid") IS 'Évalue les badges d''un utilisateur depuis les données existantes et décerne ceux qui manquent. Renvoie les clés nouvellement débloquées.';



CREATE OR REPLACE FUNCTION "public"."wodbud_recalc_profile_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_total int;
  v_current int := 0;
  v_longest int := 0;
  v_run int := 0;
  v_prev date;
  r record;
begin
  select coalesce(sum(active_minutes), 0) into v_total
  from public.workout_sessions where user_id = v_user;

  -- Série de jours consécutifs, calculée sur les jours distincts d'entraînement.
  for r in
    select distinct (coalesce(started_at, performed_at))::date as d
    from public.workout_sessions
    where user_id = v_user and active_minutes > 0
    order by d desc
  loop
    if v_prev is null then
      v_run := 1;
      -- La série courante ne vit que si le dernier entraînement est aujourd'hui ou hier.
      if r.d >= current_date - 1 then v_current := 1; end if;
    elsif v_prev - r.d = 1 then
      v_run := v_run + 1;
      if v_current = v_run - 1 then v_current := v_run; end if;
    else
      v_run := 1;
    end if;

    if v_run > v_longest then v_longest := v_run; end if;
    v_prev := r.d;
  end loop;

  update public.profiles
  set total_minutes = v_total,
      current_streak = v_current,
      longest_streak = greatest(longest_streak, v_longest)
  where id = v_user;

  return null;
end;
$$;


ALTER FUNCTION "public"."wodbud_recalc_profile_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_set_vote_option_color"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  new.color := public.wodbud_vote_color(new.position);
  return new;
end;
$$;


ALTER FUNCTION "public"."wodbud_set_vote_option_color"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."wodbud_vote_color"("p_position" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select (array['#ff4d00','#38bdf8','#a78bfa','#34d399','#facc15','#f472b6'])
         [((greatest(p_position,1) - 1) % 6) + 1];
$$;


ALTER FUNCTION "public"."wodbud_vote_color"("p_position" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."admin_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_custom_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_key" "text" NOT NULL,
    "ex_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "sets" smallint DEFAULT 3 NOT NULL,
    "reps_low" smallint DEFAULT 8 NOT NULL,
    "reps_high" smallint DEFAULT 12 NOT NULL,
    "rest" "text",
    "rir" "text",
    "comment" "text",
    "sort_order" integer DEFAULT 100 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_custom_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_custom_foods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "portion" "text",
    "calories" numeric DEFAULT 0 NOT NULL,
    "protein" numeric DEFAULT 0 NOT NULL,
    "carbs" numeric DEFAULT 0 NOT NULL,
    "fat" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_custom_foods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_custom_workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "focus" "text",
    "day" "text",
    "accent" "text" DEFAULT '#34d399'::"text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_custom_workouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_food_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "log_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "meal" "text" NOT NULL,
    "name" "text" NOT NULL,
    "portion" "text",
    "qty" numeric DEFAULT 1 NOT NULL,
    "calories" numeric DEFAULT 0 NOT NULL,
    "protein" numeric DEFAULT 0 NOT NULL,
    "carbs" numeric DEFAULT 0 NOT NULL,
    "fat" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_food_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_hidden_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workout_key" "text" NOT NULL,
    "exercise_key" "text" NOT NULL
);


ALTER TABLE "public"."app_hidden_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_hidden_workouts" (
    "workout_key" "text" NOT NULL
);


ALTER TABLE "public"."app_hidden_workouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "workout_key" "text" NOT NULL,
    "workout_name" "text" NOT NULL,
    "week_number" smallint DEFAULT 1 NOT NULL,
    "is_deload" boolean DEFAULT false NOT NULL,
    "completed" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_set_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "exercise_key" "text" NOT NULL,
    "exercise_name" "text" NOT NULL,
    "set_index" smallint DEFAULT 1 NOT NULL,
    "weight" numeric,
    "reps" smallint,
    "rir" numeric,
    "done" boolean DEFAULT false NOT NULL,
    "comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_set_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "id" smallint DEFAULT 1 NOT NULL,
    "target_calories" integer DEFAULT 3400 NOT NULL,
    "target_protein" integer DEFAULT 150 NOT NULL,
    "target_carbs" integer DEFAULT 450 NOT NULL,
    "target_fat" integer DEFAULT 88 NOT NULL,
    "unit" "text" DEFAULT 'lbs'::"text" NOT NULL,
    "theme" "text" DEFAULT 'dark'::"text" NOT NULL,
    "current_week" smallint DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "app_settings_singleton" CHECK (("id" = 1)),
    CONSTRAINT "app_settings_theme_check" CHECK (("theme" = ANY (ARRAY['dark'::"text", 'light'::"text", 'auto'::"text", 'clair'::"text", 'sombre'::"text"])))
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_weight_logs" (
    "log_date" "date" NOT NULL,
    "weight" numeric NOT NULL,
    "unit" "text" DEFAULT 'lb'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_weight_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."badges" (
    "key" "text" NOT NULL,
    "position" integer NOT NULL,
    "family" "text" NOT NULL,
    "display_fr" "text" NOT NULL,
    "display_en" "text" NOT NULL,
    "display_es" "text" NOT NULL,
    "condition_fr" "text" NOT NULL,
    "condition_en" "text" NOT NULL,
    "condition_es" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "threshold" integer,
    "available" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_members" (
    "class_id" "uuid" NOT NULL,
    "athlete_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."class_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "workout_id" "uuid",
    "title" "text",
    "notes" "text",
    "scheduled_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."class_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_members" (
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."community_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_methods" (
    "exercise_id" "uuid" NOT NULL,
    "method_key" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."exercise_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercise_muscles" (
    "exercise_id" "uuid" NOT NULL,
    "muscle_group_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "contribution" numeric,
    CONSTRAINT "exercise_muscles_contribution_check" CHECK ((("contribution" IS NULL) OR (("contribution" > (0)::numeric) AND ("contribution" <= (1)::numeric)))),
    CONSTRAINT "exercise_muscles_role_check" CHECK (("role" = ANY (ARRAY['primary'::"text", 'secondary'::"text", 'tertiary'::"text"])))
);


ALTER TABLE "public"."exercise_muscles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercise_muscles"."contribution" IS 'Pondération manuelle 0-1. NULL = valeur par défaut du rôle (primary 1.0, secondary 0.5, tertiary 0.25).';



CREATE TABLE IF NOT EXISTS "public"."exercise_votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workout_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vote_session_id" "uuid",
    "vote_option_id" "uuid"
);


ALTER TABLE "public"."exercise_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "video_path" "text",
    "video_url" "text",
    "category" "text" NOT NULL,
    "body_region" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "movement_type" "text",
    "secondary_movements" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_time_based" boolean DEFAULT false NOT NULL,
    CONSTRAINT "exercises_body_region_check" CHECK (("body_region" = ANY (ARRAY['upper'::"text", 'lower'::"text", 'core'::"text", 'full'::"text"]))),
    CONSTRAINT "exercises_category_check" CHECK (("category" = ANY (ARRAY['strength'::"text", 'olympic'::"text", 'gymnastics'::"text", 'cardio'::"text", 'mobility'::"text", 'accessory'::"text"])))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


COMMENT ON COLUMN "public"."exercises"."movement_type" IS 'Patron de mouvement dominant. NULL = pas encore classé.';



COMMENT ON COLUMN "public"."exercises"."secondary_movements" IS 'Patrons secondaires. Un thruster est push en primaire mais sollicite aussi climb.';



COMMENT ON COLUMN "public"."exercises"."is_time_based" IS 'Activité mesurée en durée plutôt qu''en répétitions. Sert à proposer la saisie directe de minutes.';



CREATE TABLE IF NOT EXISTS "public"."movement_types" (
    "key" "text" NOT NULL,
    "display_fr" "text" NOT NULL,
    "display_en" "text" NOT NULL,
    "display_es" "text" NOT NULL,
    "description_fr" "text",
    "sort_order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."movement_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."muscle_groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name_key" "text" NOT NULL,
    "body_region" "text" NOT NULL,
    "display_fr" "text",
    "display_en" "text",
    "display_es" "text",
    "svg_key" "text",
    "size_class" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "muscle_groups_body_region_check" CHECK (("body_region" = ANY (ARRAY['upper'::"text", 'lower'::"text", 'core'::"text", 'full'::"text"]))),
    CONSTRAINT "muscle_groups_size_class_check" CHECK ((("size_class" IS NULL) OR ("size_class" = ANY (ARRAY['large'::"text", 'medium'::"text", 'small'::"text"]))))
);


ALTER TABLE "public"."muscle_groups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "language" "text" DEFAULT 'fr'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "total_minutes" integer DEFAULT 0 NOT NULL,
    "current_streak" integer DEFAULT 0 NOT NULL,
    "longest_streak" integer DEFAULT 0 NOT NULL,
    "theme_pref" "text" DEFAULT 'auto'::"text" NOT NULL,
    "segment" "text",
    "badges_seen_at" timestamp with time zone,
    "rank_seen_key" "text",
    "avatar_url" "text",
    "social_links" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    CONSTRAINT "profiles_language_check" CHECK (("language" = ANY (ARRAY['fr'::"text", 'en'::"text", 'es'::"text"]))),
    CONSTRAINT "profiles_segment_check" CHECK ((("segment" IS NULL) OR ("segment" = ANY (ARRAY['individu'::"text", 'gym'::"text"])))),
    CONSTRAINT "profiles_theme_pref_check" CHECK (("theme_pref" = ANY (ARRAY['clair'::"text", 'sombre'::"text", 'auto'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."segment" IS 'Portail choisi à l''entrée : individu (particulier) ou gym (business / propriétaire).';



COMMENT ON COLUMN "public"."profiles"."badges_seen_at" IS 'Dernière consultation de la collection de badges. Un badge décerné après cette date est « nouveau ».';



COMMENT ON COLUMN "public"."profiles"."rank_seen_key" IS 'Dernier rang vu par l''utilisateur. Différent du rang courant = montée non annoncée.';



CREATE TABLE IF NOT EXISTS "public"."rank_shares" (
    "token" "text" DEFAULT "encode"("extensions"."gen_random_bytes"(9), 'hex'::"text") NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone
);


ALTER TABLE "public"."rank_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ranks" (
    "position" integer NOT NULL,
    "key" "text" NOT NULL,
    "display_fr" "text" NOT NULL,
    "display_en" "text" NOT NULL,
    "display_es" "text" NOT NULL,
    "min_minutes" integer NOT NULL,
    "color" "text" NOT NULL,
    "motto_fr" "text",
    "motto_en" "text",
    "motto_es" "text"
);


ALTER TABLE "public"."ranks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "workout_id" "uuid",
    "title" "text",
    "scheduled_date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    "class_plan_id" "uuid"
);


ALTER TABLE "public"."scheduled_workouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_exercises" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "sets_completed" integer,
    "notes" "text"
);


ALTER TABLE "public"."session_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#FF4D00'::"text" NOT NULL,
    "description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."training_methods" (
    "key" "text" NOT NULL,
    "display_fr" "text" NOT NULL,
    "display_en" "text" NOT NULL,
    "display_es" "text" NOT NULL,
    "icon" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."training_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_badges" (
    "user_id" "uuid" NOT NULL,
    "badge_key" "text" NOT NULL,
    "unlocked_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_badges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vote_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vote_session_id" "uuid" NOT NULL,
    "exercise_id" "uuid",
    "label" "text",
    "color" "text" DEFAULT '#ff4d00'::"text" NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vote_options" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vote_results" WITH ("security_invoker"='true') AS
 SELECT "vo"."vote_session_id",
    "vo"."id" AS "vote_option_id",
    "vo"."position",
    COALESCE("vo"."label", "e"."name", ('Option '::"text" || "vo"."position")) AS "label",
    "vo"."color",
    "vo"."exercise_id",
    "count"("ev"."id") AS "votes",
    "round"(((100.0 * ("count"("ev"."id"))::numeric) / NULLIF("sum"("count"("ev"."id")) OVER (PARTITION BY "vo"."vote_session_id"), (0)::numeric)), 1) AS "percentage",
    (("count"("ev"."id") = "max"("count"("ev"."id")) OVER (PARTITION BY "vo"."vote_session_id")) AND ("count"("ev"."id") > 0)) AS "is_leading"
   FROM (("public"."vote_options" "vo"
     LEFT JOIN "public"."exercises" "e" ON (("e"."id" = "vo"."exercise_id")))
     LEFT JOIN "public"."exercise_votes" "ev" ON (("ev"."vote_option_id" = "vo"."id")))
  GROUP BY "vo"."vote_session_id", "vo"."id", "vo"."position", "vo"."label", "vo"."color", "vo"."exercise_id", "e"."name";


ALTER VIEW "public"."vote_results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vote_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "coach_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "exercise_options" "uuid"[] NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vote_sessions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."vote_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workout_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" integer DEFAULT 1 NOT NULL,
    "sets" integer,
    "reps" "text",
    "weight" "text",
    "rest_seconds" integer,
    "notes" "text"
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workout_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "performed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_minutes" integer,
    "active_minutes" integer DEFAULT 0 NOT NULL,
    "activity_exercise_id" "uuid"
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workout_sessions"."active_minutes" IS 'Minutes où le chrono roulait ET au moins une série était enregistrée. Les repos de plus de 5 min sont exclus. C''est la seule colonne qui compte pour les rangs — sinon le système se fait farmer.';



COMMENT ON COLUMN "public"."workout_sessions"."activity_exercise_id" IS 'Activité unique d''une séance journalisée à la main (course, corde à sauter...). Null pour une séance issue d''un WOD ou d''une séance libre.';



CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "method" "text" DEFAULT 'amrap'::"text" NOT NULL,
    "duration_minutes" integer,
    "notes" "text",
    "theme_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workouts_method_check" CHECK (("method" = ANY (ARRAY['amrap'::"text", 'emom'::"text", 'for_time'::"text", 'rounds'::"text", 'strength'::"text", 'tabata'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."app_custom_exercises"
    ADD CONSTRAINT "app_custom_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_custom_foods"
    ADD CONSTRAINT "app_custom_foods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_custom_workouts"
    ADD CONSTRAINT "app_custom_workouts_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."app_custom_workouts"
    ADD CONSTRAINT "app_custom_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_food_logs"
    ADD CONSTRAINT "app_food_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_hidden_exercises"
    ADD CONSTRAINT "app_hidden_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_hidden_exercises"
    ADD CONSTRAINT "app_hidden_exercises_workout_key_exercise_key_key" UNIQUE ("workout_key", "exercise_key");



ALTER TABLE ONLY "public"."app_hidden_workouts"
    ADD CONSTRAINT "app_hidden_workouts_pkey" PRIMARY KEY ("workout_key");



ALTER TABLE ONLY "public"."app_sessions"
    ADD CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_set_logs"
    ADD CONSTRAINT "app_set_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_weight_logs"
    ADD CONSTRAINT "app_weight_logs_pkey" PRIMARY KEY ("log_date");



ALTER TABLE ONLY "public"."badges"
    ADD CONSTRAINT "badges_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_pkey" PRIMARY KEY ("class_id", "athlete_id");



ALTER TABLE ONLY "public"."class_plans"
    ADD CONSTRAINT "class_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_pkey" PRIMARY KEY ("community_id", "user_id");



ALTER TABLE ONLY "public"."exercise_methods"
    ADD CONSTRAINT "exercise_methods_pkey" PRIMARY KEY ("exercise_id", "method_key");



ALTER TABLE ONLY "public"."exercise_muscles"
    ADD CONSTRAINT "exercise_muscles_pkey" PRIMARY KEY ("exercise_id", "muscle_group_id");



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_exercise_id_user_id_workout_id_key" UNIQUE ("exercise_id", "user_id", "workout_id");



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."movement_types"
    ADD CONSTRAINT "movement_types_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_name_key_key" UNIQUE ("name_key");



ALTER TABLE ONLY "public"."muscle_groups"
    ADD CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rank_shares"
    ADD CONSTRAINT "rank_shares_pkey" PRIMARY KEY ("token");



ALTER TABLE ONLY "public"."rank_shares"
    ADD CONSTRAINT "rank_shares_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."ranks"
    ADD CONSTRAINT "ranks_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."ranks"
    ADD CONSTRAINT "ranks_pkey" PRIMARY KEY ("position");



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."training_methods"
    ADD CONSTRAINT "training_methods_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_id", "badge_key");



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_vote_session_id_position_key" UNIQUE ("vote_session_id", "position");



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "class_plans_class_date_idx" ON "public"."class_plans" USING "btree" ("class_id", "scheduled_date");



CREATE INDEX "class_plans_workout_idx" ON "public"."class_plans" USING "btree" ("workout_id");



CREATE INDEX "exercise_methods_method_idx" ON "public"."exercise_methods" USING "btree" ("method_key");



CREATE INDEX "exercise_muscles_exercise_id_idx" ON "public"."exercise_muscles" USING "btree" ("exercise_id");



CREATE INDEX "exercise_muscles_muscle_group_id_idx" ON "public"."exercise_muscles" USING "btree" ("muscle_group_id");



CREATE INDEX "exercise_votes_exercise_id_idx" ON "public"."exercise_votes" USING "btree" ("exercise_id");



CREATE UNIQUE INDEX "exercise_votes_one_per_session" ON "public"."exercise_votes" USING "btree" ("vote_session_id", "user_id") WHERE ("vote_session_id" IS NOT NULL);



CREATE UNIQUE INDEX "exercise_votes_user_exercise_session_uniq" ON "public"."exercise_votes" USING "btree" ("user_id", "exercise_id", "vote_session_id") WHERE ("vote_session_id" IS NOT NULL);



CREATE INDEX "exercise_votes_workout_id_idx" ON "public"."exercise_votes" USING "btree" ("workout_id");



CREATE INDEX "exercises_body_region_idx" ON "public"."exercises" USING "btree" ("body_region");



CREATE INDEX "exercises_category_idx" ON "public"."exercises" USING "btree" ("category");



CREATE INDEX "exercises_created_by_idx" ON "public"."exercises" USING "btree" ("created_by");



CREATE INDEX "exercises_movement_type_idx" ON "public"."exercises" USING "btree" ("movement_type");



CREATE INDEX "exercises_secondary_movements_idx" ON "public"."exercises" USING "gin" ("secondary_movements");



CREATE INDEX "idx_custom_ex_workout" ON "public"."app_custom_exercises" USING "btree" ("workout_key");



CREATE INDEX "idx_food_logs_date" ON "public"."app_food_logs" USING "btree" ("log_date");



CREATE INDEX "idx_sessions_date" ON "public"."app_sessions" USING "btree" ("session_date");



CREATE INDEX "idx_sessions_key" ON "public"."app_sessions" USING "btree" ("workout_key");



CREATE INDEX "idx_set_logs_exercise" ON "public"."app_set_logs" USING "btree" ("exercise_key");



CREATE INDEX "idx_set_logs_session" ON "public"."app_set_logs" USING "btree" ("session_id");



CREATE UNIQUE INDEX "scheduled_workouts_class_plan_user_key" ON "public"."scheduled_workouts" USING "btree" ("class_plan_id", "user_id") WHERE ("class_plan_id" IS NOT NULL);



CREATE UNIQUE INDEX "scheduled_workouts_session_id_key" ON "public"."scheduled_workouts" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "scheduled_workouts_user_date_idx" ON "public"."scheduled_workouts" USING "btree" ("user_id", "scheduled_date");



CREATE INDEX "session_exercises_session_id_idx" ON "public"."session_exercises" USING "btree" ("session_id");



CREATE INDEX "user_badges_user_idx" ON "public"."user_badges" USING "btree" ("user_id");



CREATE INDEX "vote_options_session_idx" ON "public"."vote_options" USING "btree" ("vote_session_id");



CREATE INDEX "workout_exercises_workout_id_idx" ON "public"."workout_exercises" USING "btree" ("workout_id");



CREATE INDEX "workout_exercises_workout_id_position_idx" ON "public"."workout_exercises" USING "btree" ("workout_id", "position");



CREATE INDEX "workout_sessions_activity_exercise_idx" ON "public"."workout_sessions" USING "btree" ("activity_exercise_id") WHERE ("activity_exercise_id" IS NOT NULL);



CREATE INDEX "workout_sessions_performed_at_idx" ON "public"."workout_sessions" USING "btree" ("performed_at" DESC);



CREATE INDEX "workout_sessions_user_id_idx" ON "public"."workout_sessions" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "class_members_plans" AFTER INSERT OR DELETE ON "public"."class_members" FOR EACH ROW EXECUTE FUNCTION "public"."wodbud_class_membership_plans"();



CREATE OR REPLACE TRIGGER "class_plans_fanout" AFTER INSERT OR UPDATE ON "public"."class_plans" FOR EACH ROW EXECUTE FUNCTION "public"."wodbud_class_plan_fanout"();



CREATE OR REPLACE TRIGGER "exercises_updated_at" BEFORE UPDATE ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_wodbud_vote_option_color" BEFORE INSERT OR UPDATE OF "position" ON "public"."vote_options" FOR EACH ROW EXECUTE FUNCTION "public"."wodbud_set_vote_option_color"();



CREATE OR REPLACE TRIGGER "wodbud_sessions_totals" AFTER INSERT OR DELETE OR UPDATE OF "active_minutes", "started_at", "performed_at" ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."wodbud_recalc_profile_totals"();



CREATE OR REPLACE TRIGGER "workouts_updated_at" BEFORE UPDATE ON "public"."workouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_users"
    ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."app_set_logs"
    ADD CONSTRAINT "app_set_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."app_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_members"
    ADD CONSTRAINT "class_members_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_plans"
    ADD CONSTRAINT "class_plans_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_plans"
    ADD CONSTRAINT "class_plans_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."class_plans"
    ADD CONSTRAINT "class_plans_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."classes"
    ADD CONSTRAINT "classes_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_members"
    ADD CONSTRAINT "community_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_methods"
    ADD CONSTRAINT "exercise_methods_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_methods"
    ADD CONSTRAINT "exercise_methods_method_key_fkey" FOREIGN KEY ("method_key") REFERENCES "public"."training_methods"("key") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_muscles"
    ADD CONSTRAINT "exercise_muscles_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_muscles"
    ADD CONSTRAINT "exercise_muscles_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "public"."muscle_groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_vote_option_id_fkey" FOREIGN KEY ("vote_option_id") REFERENCES "public"."vote_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_vote_session_id_fkey" FOREIGN KEY ("vote_session_id") REFERENCES "public"."vote_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercise_votes"
    ADD CONSTRAINT "exercise_votes_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_movement_type_fkey" FOREIGN KEY ("movement_type") REFERENCES "public"."movement_types"("key") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rank_shares"
    ADD CONSTRAINT "rank_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_class_plan_id_fkey" FOREIGN KEY ("class_plan_id") REFERENCES "public"."class_plans"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_workouts"
    ADD CONSTRAINT "scheduled_workouts_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_exercises"
    ADD CONSTRAINT "session_exercises_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_badge_key_fkey" FOREIGN KEY ("badge_key") REFERENCES "public"."badges"("key") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_badges"
    ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vote_options"
    ADD CONSTRAINT "vote_options_vote_session_id_fkey" FOREIGN KEY ("vote_session_id") REFERENCES "public"."vote_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vote_sessions"
    ADD CONSTRAINT "vote_sessions_coach_id_fkey" FOREIGN KEY ("coach_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_activity_exercise_id_fkey" FOREIGN KEY ("activity_exercise_id") REFERENCES "public"."exercises"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE SET NULL;



ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admin_users: créer" ON "public"."admin_users" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "admin_users: lire" ON "public"."admin_users" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "admin_users: modifier" ON "public"."admin_users" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "admin_users: supprimer" ON "public"."admin_users" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."app_custom_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_custom_foods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_custom_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_food_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_hidden_exercises" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_hidden_workouts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_set_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_weight_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "badges: lecture publique" ON "public"."badges" FOR SELECT USING (true);



ALTER TABLE "public"."class_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_members: ajouter" ON "public"."class_members" FOR INSERT TO "authenticated" WITH CHECK ((("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_coach"("class_id")));



CREATE POLICY "class_members: lire" ON "public"."class_members" FOR SELECT TO "authenticated" USING ((("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_member"("class_id") OR "public"."is_class_coach"("class_id")));



CREATE POLICY "class_members: retirer" ON "public"."class_members" FOR DELETE TO "authenticated" USING ((("athlete_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_class_coach"("class_id")));



ALTER TABLE "public"."class_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "class_plans: créer" ON "public"."class_plans" FOR INSERT TO "authenticated" WITH CHECK ((("coach_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_class_coach"("class_id")));



CREATE POLICY "class_plans: lire" ON "public"."class_plans" FOR SELECT TO "authenticated" USING (("public"."is_class_coach"("class_id") OR "public"."is_class_member"("class_id") OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "class_plans: modifier" ON "public"."class_plans" FOR UPDATE TO "authenticated" USING ("public"."is_class_coach"("class_id")) WITH CHECK ("public"."is_class_coach"("class_id"));



CREATE POLICY "class_plans: supprimer" ON "public"."class_plans" FOR DELETE TO "authenticated" USING ("public"."is_class_coach"("class_id"));



ALTER TABLE "public"."classes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "classes: créer" ON "public"."classes" FOR INSERT TO "authenticated" WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "classes: lire" ON "public"."classes" FOR SELECT TO "authenticated" USING ((("coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."class_members" "cm"
  WHERE (("cm"."class_id" = "classes"."id") AND ("cm"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "classes: modifier" ON "public"."classes" FOR UPDATE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "classes: supprimer" ON "public"."classes" FOR DELETE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communities: créer" ON "public"."communities" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "communities: lire" ON "public"."communities" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "communities: modifier" ON "public"."communities" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "communities: supprimer" ON "public"."communities" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."community_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_members: lire" ON "public"."community_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "community_members: quitter ou retirer" ON "public"."community_members" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."communities" "c"
  WHERE (("c"."id" = "community_members"."community_id") AND ("c"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "community_members: rejoindre" ON "public"."community_members" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."exercise_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_methods: créer" ON "public"."exercise_methods" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."exercises" "e"
  WHERE (("e"."id" = "exercise_methods"."exercise_id") AND ("e"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "exercise_methods: lecture publique" ON "public"."exercise_methods" FOR SELECT USING (true);



CREATE POLICY "exercise_methods: modifier" ON "public"."exercise_methods" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."exercises" "e"
  WHERE (("e"."id" = "exercise_methods"."exercise_id") AND ("e"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."exercises" "e"
  WHERE (("e"."id" = "exercise_methods"."exercise_id") AND ("e"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "exercise_methods: supprimer" ON "public"."exercise_methods" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."exercises" "e"
  WHERE (("e"."id" = "exercise_methods"."exercise_id") AND ("e"."created_by" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."exercise_muscles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercise_muscles: créer" ON "public"."exercise_muscles" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "exercise_muscles: lecture publique" ON "public"."exercise_muscles" FOR SELECT USING (true);



CREATE POLICY "exercise_muscles: modifier" ON "public"."exercise_muscles" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "exercise_muscles: supprimer" ON "public"."exercise_muscles" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."exercise_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercises: créer" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "exercises: lecture publique" ON "public"."exercises" FOR SELECT USING (true);



CREATE POLICY "exercises: modifier" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "exercises: supprimer" ON "public"."exercises" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."movement_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "movement_types: créer" ON "public"."movement_types" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "movement_types: lecture publique" ON "public"."movement_types" FOR SELECT USING (true);



CREATE POLICY "movement_types: modifier" ON "public"."movement_types" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "movement_types: supprimer" ON "public"."movement_types" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."muscle_groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "muscle_groups: créer" ON "public"."muscle_groups" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "muscle_groups: lecture publique" ON "public"."muscle_groups" FOR SELECT USING (true);



CREATE POLICY "muscle_groups: modifier" ON "public"."muscle_groups" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "muscle_groups: supprimer" ON "public"."muscle_groups" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: créer le sien" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "profiles: lire" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin") OR (EXISTS ( SELECT 1
   FROM ("public"."class_members" "my_cm"
     JOIN "public"."class_members" "their_cm" ON (("their_cm"."class_id" = "my_cm"."class_id")))
  WHERE (("my_cm"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("their_cm"."athlete_id" = "profiles"."id")))) OR (EXISTS ( SELECT 1
   FROM ("public"."class_members" "cm"
     JOIN "public"."classes" "c" ON (("c"."id" = "cm"."class_id")))
  WHERE (("cm"."athlete_id" = "profiles"."id") AND ("c"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "profiles: modifier" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."rank_shares" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rank_shares: gérer le sien" ON "public"."rank_shares" TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."ranks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ranks: lecture publique" ON "public"."ranks" FOR SELECT USING (true);



ALTER TABLE "public"."scheduled_workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_workouts: créer" ON "public"."scheduled_workouts" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "scheduled_workouts: lire" ON "public"."scheduled_workouts" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin") OR (EXISTS ( SELECT 1
   FROM "public"."class_plans" "cp"
  WHERE (("cp"."id" = "scheduled_workouts"."class_plan_id") AND "public"."is_class_coach"("cp"."class_id"))))));



CREATE POLICY "scheduled_workouts: modifier" ON "public"."scheduled_workouts" FOR UPDATE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "scheduled_workouts: supprimer" ON "public"."scheduled_workouts" FOR DELETE TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."session_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_exercises: gérer les siens" ON "public"."session_exercises" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "session_exercises"."session_id") AND (("ws"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "session_exercises"."session_id") AND (("ws"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))))));



CREATE POLICY "sessions: gérer les siennes" ON "public"."workout_sessions" TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "themes: créer" ON "public"."themes" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "themes: lecture publique" ON "public"."themes" FOR SELECT USING (true);



CREATE POLICY "themes: modifier" ON "public"."themes" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "themes: supprimer" ON "public"."themes" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."training_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "training_methods: créer" ON "public"."training_methods" FOR INSERT TO "authenticated" WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "training_methods: lecture publique" ON "public"."training_methods" FOR SELECT USING (true);



CREATE POLICY "training_methods: modifier" ON "public"."training_methods" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "training_methods: supprimer" ON "public"."training_methods" FOR DELETE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin"));



ALTER TABLE "public"."user_badges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_badges: voir les siens" ON "public"."user_badges" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."vote_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vote_options: créer" ON "public"."vote_options" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "vote_options: lire" ON "public"."vote_options" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."vote_sessions" "vs"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "vs"."class_id")))
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("cm"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "vote_options: modifier" ON "public"."vote_options" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "vote_options: supprimer" ON "public"."vote_options" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "vote_options"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."vote_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vote_sessions: créer" ON "public"."vote_sessions" FOR INSERT TO "authenticated" WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "vote_sessions: lire" ON "public"."vote_sessions" FOR SELECT TO "authenticated" USING ((("coach_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."class_members" "cm"
  WHERE (("cm"."class_id" = "vote_sessions"."class_id") AND ("cm"."athlete_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "vote_sessions: modifier" ON "public"."vote_sessions" FOR UPDATE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "vote_sessions: supprimer" ON "public"."vote_sessions" FOR DELETE TO "authenticated" USING (("coach_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "votes: lire" ON "public"."exercise_votes" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "exercise_votes"."vote_session_id") AND ("vs"."coach_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR (EXISTS ( SELECT 1
   FROM ("public"."vote_sessions" "vs"
     JOIN "public"."class_members" "cm" ON (("cm"."class_id" = "vs"."class_id")))
  WHERE (("vs"."id" = "exercise_votes"."vote_session_id") AND ("cm"."athlete_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "votes: modifier (admin)" ON "public"."exercise_votes" FOR UPDATE TO "authenticated" USING (( SELECT "public"."is_admin"() AS "is_admin")) WITH CHECK (( SELECT "public"."is_admin"() AS "is_admin"));



CREATE POLICY "votes: retirer son vote" ON "public"."exercise_votes" FOR DELETE TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "exercise_votes"."vote_session_id") AND ("vs"."status" = 'open'::"text") AND (("vs"."deadline" IS NULL) OR (("vs"."deadline" + '24:00:00'::interval) > "now"())))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "votes: voter" ON "public"."exercise_votes" FOR INSERT TO "authenticated" WITH CHECK (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."vote_sessions" "vs"
  WHERE (("vs"."id" = "exercise_votes"."vote_session_id") AND ("vs"."status" = 'open'::"text") AND (("vs"."deadline" IS NULL) OR (("vs"."deadline" + '24:00:00'::interval) > "now"())))))) OR ( SELECT "public"."is_admin"() AS "is_admin")));



ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_exercises: créer" ON "public"."workout_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))))));



CREATE POLICY "workout_exercises: lire" ON "public"."workout_exercises" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin") OR "public"."is_admin_authored"("w"."created_by"))))) OR (EXISTS ( SELECT 1
   FROM "public"."class_plans" "cp"
  WHERE (("cp"."workout_id" = "workout_exercises"."workout_id") AND "public"."is_class_member"("cp"."class_id"))))));



CREATE POLICY "workout_exercises: modifier" ON "public"."workout_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))))));



CREATE POLICY "workout_exercises: supprimer" ON "public"."workout_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workouts" "w"
  WHERE (("w"."id" = "workout_exercises"."workout_id") AND (("w"."created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))))));



ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workouts: créer" ON "public"."workouts" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "workouts: lire" ON "public"."workouts" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin") OR "public"."is_admin_authored"("created_by")));



CREATE POLICY "workouts: modifier" ON "public"."workouts" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin"))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));



CREATE POLICY "workouts: supprimer" ON "public"."workouts" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ( SELECT "public"."is_admin"() AS "is_admin")));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."classes" TO "anon";
GRANT ALL ON TABLE "public"."classes" TO "authenticated";
GRANT ALL ON TABLE "public"."classes" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_class_by_invite_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_class_by_invite_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_by_invite_token"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_class_leaderboard_since"("p_class_id" "uuid", "p_since" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_class_leaderboard_since"("p_class_id" "uuid", "p_since" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_class_leaderboard_since"("p_class_id" "uuid", "p_since" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_shared_rank"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_shared_rank"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_shared_rank"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_authored"("p_uid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_authored"("p_uid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_authored"("p_uid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_class_coach"("p_class_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_class_coach"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_coach"("p_class_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_class_member"("p_class_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wodbud_class_membership_plans"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wodbud_class_membership_plans"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wodbud_class_plan_fanout"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wodbud_class_plan_fanout"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wodbud_rank_for_minutes"("p_minutes" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."wodbud_rank_for_minutes"("p_minutes" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wodbud_rank_for_minutes"("p_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."wodbud_recalc_badges"("p_user" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."wodbud_recalc_profile_totals"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wodbud_recalc_profile_totals"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."wodbud_set_vote_option_color"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."wodbud_set_vote_option_color"() TO "service_role";



GRANT ALL ON FUNCTION "public"."wodbud_vote_color"("p_position" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."wodbud_vote_color"("p_position" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."wodbud_vote_color"("p_position" integer) TO "service_role";


















GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";



GRANT ALL ON TABLE "public"."app_custom_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."app_custom_foods" TO "service_role";



GRANT ALL ON TABLE "public"."app_custom_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."app_food_logs" TO "service_role";



GRANT ALL ON TABLE "public"."app_hidden_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."app_hidden_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."app_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."app_set_logs" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."app_weight_logs" TO "service_role";



GRANT ALL ON TABLE "public"."badges" TO "anon";
GRANT ALL ON TABLE "public"."badges" TO "authenticated";
GRANT ALL ON TABLE "public"."badges" TO "service_role";



GRANT ALL ON TABLE "public"."class_members" TO "anon";
GRANT ALL ON TABLE "public"."class_members" TO "authenticated";
GRANT ALL ON TABLE "public"."class_members" TO "service_role";



GRANT ALL ON TABLE "public"."class_plans" TO "anon";
GRANT ALL ON TABLE "public"."class_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."class_plans" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";



GRANT ALL ON TABLE "public"."community_members" TO "anon";
GRANT ALL ON TABLE "public"."community_members" TO "authenticated";
GRANT ALL ON TABLE "public"."community_members" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_methods" TO "anon";
GRANT ALL ON TABLE "public"."exercise_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_methods" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_muscles" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_muscles" TO "service_role";



GRANT ALL ON TABLE "public"."exercise_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."exercise_votes" TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."movement_types" TO "anon";
GRANT ALL ON TABLE "public"."movement_types" TO "authenticated";
GRANT ALL ON TABLE "public"."movement_types" TO "service_role";



GRANT ALL ON TABLE "public"."muscle_groups" TO "authenticated";
GRANT ALL ON TABLE "public"."muscle_groups" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."rank_shares" TO "anon";
GRANT ALL ON TABLE "public"."rank_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."rank_shares" TO "service_role";



GRANT ALL ON TABLE "public"."ranks" TO "anon";
GRANT ALL ON TABLE "public"."ranks" TO "authenticated";
GRANT ALL ON TABLE "public"."ranks" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_workouts" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_workouts" TO "service_role";



GRANT ALL ON TABLE "public"."session_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."session_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON TABLE "public"."training_methods" TO "anon";
GRANT ALL ON TABLE "public"."training_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."training_methods" TO "service_role";



GRANT ALL ON TABLE "public"."user_badges" TO "anon";
GRANT ALL ON TABLE "public"."user_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_badges" TO "service_role";



GRANT ALL ON TABLE "public"."vote_options" TO "anon";
GRANT ALL ON TABLE "public"."vote_options" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_options" TO "service_role";



GRANT ALL ON TABLE "public"."vote_results" TO "anon";
GRANT ALL ON TABLE "public"."vote_results" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_results" TO "service_role";



GRANT ALL ON TABLE "public"."vote_sessions" TO "anon";
GRANT ALL ON TABLE "public"."vote_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."vote_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































