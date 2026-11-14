#!/usr/bin/env node
/**
 * Préproduction (4.6) : le projet Supabase « wodbud-staging », séparé de la production.
 *
 *   npm run staging -- status      migrations du dépôt pas encore appliquées (préproduction et production)
 *   npm run staging -- migrate     applique à la préproduction les migrations qui lui manquent
 *   npm run staging -- diff        compare la structure des deux bases (tables, règles d'accès, fonctions…)
 *   npm run staging -- seed        recopie le catalogue depuis la production (aucune donnée de compte)
 *   npm run staging -- build       base neuve : schéma de référence + migrations + catalogue + comparaison
 *   npm run staging -- functions   déploie les fonctions Edge sur la préproduction
 *   npm run staging -- auth        adresses de retour de connexion (staging/supabase/config.toml)
 *
 * La production n'est jamais écrite : elle n'est lue qu'en lecture seule (status, diff, seed).
 * Passe par la CLI Supabase (`npx supabase login` une fois) : ni mot de passe de base, ni Docker.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const PROD = 'onyifpsvwprviuhnomxg'
const STAGING = 'sqhkygxaqqycynadcfmk'
/** schema.sql + schema_auth_storage.sql = la base telle qu'elle était après la migration 038. */
const BASELINE = '038'
const MIGRATIONS = join(APP, 'supabase', 'migrations')

// ── CLI Supabase ─────────────────────────────────────────────────────

function supabase(args) {
  const options = { cwd: APP, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  if (process.platform !== 'win32') return spawnSync('npx', ['supabase', ...args], options)
  // Windows : npx est un .cmd, lancé par le shell ; une seule ligne de commande, arguments entre guillemets au besoin.
  const line = ['npx', 'supabase', ...args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))].join(' ')
  return spawnSync(line, { ...options, shell: true })
}

function parseJson(text) {
  const i = (text ?? '').indexOf('{')
  if (i < 0) return null
  try {
    return JSON.parse(text.slice(i))
  } catch {
    return null
  }
}

/** Exécute du SQL (une seule transaction : tout passe ou rien). Écrire dans la production est refusé. */
function query(ref, sql, { write = false } = {}) {
  if (write && ref !== STAGING) throw new Error('Refus : ce script n’écrit que dans la préproduction.')
  const dir = mkdtempSync(join(tmpdir(), 'wodbud-staging-'))
  const file = join(dir, 'query.sql')
  writeFileSync(file, sql)
  try {
    const r = supabase(['db', 'query', `--remote=${ref}`, write ? '--yes' : '--read-only', '--output-format', 'json', '-f', file])
    const json = parseJson(r.stdout) ?? parseJson(r.stderr)
    if (r.status !== 0 || !json || json._tag === 'Error') {
      throw new Error(json?.error?.message ?? `${r.stderr ?? ''}${r.stdout ?? ''}`.trim())
    }
    return json.rows ?? []
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// ── Migrations ───────────────────────────────────────────────────────

/** Fichiers du dépôt, dans l'ordre : { file, version: '044', name: 'exercise_results', stem: '044_exercise_results' }. */
function migrationFiles() {
  return readdirSync(MIGRATIONS)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()
    .map((file) => {
      const stem = file.replace(/\.sql$/, '')
      const [, version, name] = stem.match(/^(\d+)_(.+)$/)
      return { file, version, name, stem }
    })
}

/** Historique d'un projet. En production, les plus anciennes portent un horodatage et le nom complet du fichier. */
function history(ref) {
  try {
    return query(ref, 'select version, name from supabase_migrations.schema_migrations')
  } catch (e) {
    if (/does not exist/.test(e.message)) return []
    throw e
  }
}

function pending(ref, rows = history(ref)) {
  const isApplied = (m) => rows.some((r) => r.version === m.version || r.name === m.stem)
  const hasBaseline = rows.some((r) => r.name === 'schema_baseline')
  return migrationFiles().filter((m) => !isApplied(m) && !(ref === STAGING && hasBaseline && m.version <= BASELINE))
}

const HISTORY_TABLE = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`

const record = (version, name) =>
  `insert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name.replace(/'/g, "''")}');`

/**
 * Propriétaire du contenu livré par WODBUD (les benchmarks de 067 appartiennent au premier admin).
 * En production, c'est un vrai compte ; ici, un compte qui ne peut pas se connecter :
 * aucun mot de passe, adresse en .invalid, bloqué pour toujours.
 */
const CONTENT_OWNER = 'a0000000-0000-4000-8000-00000000c0de'
const ENSURE_CONTENT_OWNER = `
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, banned_until, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', '${CONTENT_OWNER}', 'authenticated', 'authenticated', 'contenu@wodbud.invalid', '',
        'infinity', '{"provider": "email", "providers": []}', '{"full_name": "WODBUD"}', now(), now())
on conflict (id) do nothing;
insert into public.admin_users (user_id)
select '${CONTENT_OWNER}' where not exists (select 1 from public.admin_users where user_id = '${CONTENT_OWNER}');`

function migrate() {
  const todo = pending(STAGING)
  if (todo.length === 0) return console.log('Préproduction à jour : aucune migration en attente.')
  query(STAGING, ENSURE_CONTENT_OWNER, { write: true })
  for (const m of todo) {
    // 039 : la tâche planifiée appelle la fonction Edge `push` de son propre projet, pas celle de la production.
    const sql = readFileSync(join(MIGRATIONS, m.file), 'utf8').replaceAll(PROD, STAGING)
    query(STAGING, `${HISTORY_TABLE}\n${sql}\n;\n${record(m.version, m.name)}`, { write: true })
    console.log(`  ✓ ${m.file}`)
  }
}

function status() {
  for (const [label, ref] of [['Préproduction', STAGING], ['Production', PROD]]) {
    const todo = pending(ref)
    console.log(`${label} : ${todo.length === 0 ? 'à jour' : `${todo.length} en attente — ${todo.map((m) => m.file).join(', ')}`}`)
  }
}

// ── Catalogue ────────────────────────────────────────────────────────

/**
 * Ce que l'app lit sans être propre à un compte. Les exercices des centres (center_id) restent en production ;
 * l'auteur et le relecteur des exercices communs sont effacés (ces comptes n'existent pas en préproduction).
 */
const CATALOG = [
  ['movement_types', 'select to_jsonb(t) j from public.movement_types t'],
  ['training_methods', 'select to_jsonb(t) j from public.training_methods t'],
  ['muscle_groups', 'select to_jsonb(t) j from public.muscle_groups t'],
  ['ranks', 'select to_jsonb(t) j from public.ranks t'],
  ['badges', 'select to_jsonb(t) j from public.badges t'],
  [
    'exercises',
    `select to_jsonb(e) || '{"created_by": null, "reviewed_by": null, "origin_center_id": null}'::jsonb j
       from public.exercises e where e.center_id is null`
  ],
  ['exercise_muscles', 'select to_jsonb(m) j from public.exercise_muscles m join public.exercises e on e.id = m.exercise_id where e.center_id is null'],
  ['exercise_methods', 'select to_jsonb(m) j from public.exercise_methods m join public.exercises e on e.id = m.exercise_id where e.center_id is null']
]

/**
 * Avant les migrations, sur une base neuve : le schéma de référence n'a pas de données, et 067 cherche
 * ses mouvements par nom. Sans les badges, que 043 et 046 insèrent eux-mêmes.
 */
const BEFORE_MIGRATIONS = CATALOG.map(([t]) => t).filter((t) => t !== 'badges')

function seed(only = CATALOG.map(([t]) => t)) {
  const catalog = CATALOG.filter(([t]) => only.includes(t))
  const names = catalog.map(([t]) => `'${t}'`).join(', ')
  const shape = query(
    STAGING,
    `select c.relname t,
       (select json_agg(a.attname order by a.attnum) from pg_attribute a
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = '' and a.attidentity <> 'a') cols,
       (select json_agg(a.attname) from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
         where i.indrelid = c.oid and i.indisprimary) pk
     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in (${names})`
  )
  const byTable = Object.fromEntries(shape.map((s) => [s.t, s]))
  const statements = ['-- Ni déclencheurs (garde de publication, badges) ni vérification des clés pendant la copie.', 'set local session_replication_role = replica;']
  const counts = []
  for (const [table, source] of catalog) {
    const s = byTable[table]
    if (!s) throw new Error(`Table absente de la préproduction : ${table}`)
    const [{ data }] = query(PROD, `select coalesce(json_agg(j), '[]'::json) data from (${source}) s`)
    const json = JSON.stringify(data)
    if (json.includes('$seed$')) throw new Error(`Délimiteur trouvé dans les données de ${table}`)
    const cols = s.cols.map((c) => `"${c}"`).join(', ')
    const rest = s.cols.filter((c) => !s.pk.includes(c))
    const onConflict = rest.length
      ? `do update set (${rest.map((c) => `"${c}"`).join(', ')}) = row(${rest.map((c) => `excluded."${c}"`).join(', ')})`
      : 'do nothing'
    statements.push(
      `insert into public.${table} (${cols}) select ${cols} from jsonb_populate_recordset(null::public.${table}, $seed$${json}$seed$::jsonb)
       on conflict (${s.pk.map((c) => `"${c}"`).join(', ')}) ${onConflict};`
    )
    counts.push(`${table} ${data.length}`)
  }
  query(STAGING, statements.join('\n'), { write: true })
  console.log(`Catalogue recopié : ${counts.join(', ')}.`)
}

// ── Comparaison des structures ───────────────────────────────────────

/** Une empreinte par objet : la définition telle que Postgres la relit (la mise en forme du fichier source n'y entre pas). */
const FINGERPRINT = `
with items(k, v) as (
  select 'table ' || c.relname, 'rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
         || ' acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(c.relacl) x), '')
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
  union all
  select 'view ' || c.relname, md5(pg_get_viewdef(c.oid))
         || ' acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(c.relacl) x), '')
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
  union all
  select 'column ' || c.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod) || case when a.attnotnull then ' not null' else '' end
         || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), '')
         || case when a.attidentity <> '' then ' identity' else '' end || case when a.attgenerated <> '' then ' generated' else '' end
    from pg_attribute a join pg_class c on c.oid = a.attrelid
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm') and a.attnum > 0 and not a.attisdropped
  union all
  select 'constraint ' || conrelid::regclass || '.' || conname, pg_get_constraintdef(oid)
    from pg_constraint where connamespace = 'public'::regnamespace and conrelid <> 0
  union all
  select 'index ' || indexname, indexdef from pg_indexes where schemaname = 'public'
  union all
  select 'policy ' || schemaname || '.' || tablename || '.' || policyname,
         permissive || ' ' || cmd || ' ' || roles::text || ' using ' || coalesce(qual, '') || ' check ' || coalesce(with_check, '')
    from pg_policies where schemaname in ('public', 'storage')
  union all
  select 'function ' || p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid))
         || ' acl=' || coalesce((select string_agg(x::text, ',' order by x::text) from unnest(p.proacl) x), '')
    from pg_proc p where p.pronamespace = 'public'::regnamespace
  union all
  select 'trigger ' || t.tgrelid::regclass || '.' || t.tgname, pg_get_triggerdef(t.oid)
    from pg_trigger t join pg_class c on c.oid = t.tgrelid
    where not t.tgisinternal and (c.relnamespace = 'public'::regnamespace or t.tgrelid = 'auth.users'::regclass)
  union all
  select 'event trigger ' || e.evtname, e.evtevent || ' ' || e.evtfoid::regproc::text || ' ' || e.evtenabled::text || ' ' || coalesce(e.evttags::text, '')
    from pg_event_trigger e join pg_proc p on p.oid = e.evtfoid where p.pronamespace = 'public'::regnamespace
  union all
  select 'type ' || t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder)
    from pg_type t join pg_enum e on e.enumtypid = t.oid where t.typnamespace = 'public'::regnamespace group by t.typname
  union all
  select 'bucket ' || id, public::text || ' ' || coalesce(file_size_limit::text, '') || ' ' || coalesce(allowed_mime_types::text, '')
    from storage.buckets
  union all
  select 'cron ' || jobname, schedule || ' ' || md5(replace(replace(command, '${PROD}', 'REF'), '${STAGING}', 'REF')) from cron.job
  union all
  select 'extension ' || extname, '' from pg_extension
)
select jsonb_object_agg(k, v) fp from items`

function diff() {
  const [prod, staging] = [PROD, STAGING].map((ref) => query(ref, FINGERPRINT)[0].fp)
  const keys = [...new Set([...Object.keys(prod), ...Object.keys(staging)])].sort()
  const missing = keys.filter((k) => !(k in staging))
  const extra = keys.filter((k) => !(k in prod))
  const changed = keys.filter((k) => k in prod && k in staging && prod[k] !== staging[k])
  const show = (title, list, fmt) => list.length && console.log(`\n${title} (${list.length})\n${list.map(fmt).join('\n')}`)
  show('Manque en préproduction', missing, (k) => `  - ${k}`)
  show('En trop en préproduction', extra, (k) => `  + ${k}`)
  show('Différent', changed, (k) => `  ~ ${k}\n      production    : ${prod[k]}\n      préproduction : ${staging[k]}`)
  const total = missing.length + extra.length + changed.length
  console.log(total === 0 ? `Structures identiques (${keys.length} objets comparés).` : `\n${total} écart(s) sur ${keys.length} objets.`)
  return total
}

// ── Base neuve, fonctions, connexion ─────────────────────────────────

function build() {
  const [{ n }] = query(STAGING, `select count(*)::int n from pg_tables where schemaname = 'public'`)
  if (n > 0) throw new Error(`La préproduction a déjà ${n} table(s) : « build » ne sert qu'à une base neuve (utilise « migrate »).`)
  const schema = readFileSync(join(APP, 'supabase', 'schema.sql'), 'utf8')
  const authStorage = readFileSync(join(APP, 'supabase', 'schema_auth_storage.sql'), 'utf8')
  // pg_dump écrit les droits de chaque objet à partir des droits par défaut de Postgres, sans ceux
  // qu'ajoute Supabase (tout à anon, authenticated, service_role) : sans ce retrait, chaque table
  // recréée rendrait à anon ce que la production lui avait retiré. Le schéma remet ces droits par
  // défaut à la fin, pour les objets créés ensuite par les migrations, comme en production.
  const noDefaults = ['tables', 'sequences', 'functions']
    .map((kind) => `alter default privileges for role postgres in schema public revoke all on ${kind} from anon, authenticated, service_role;`)
    .join('\n')
  query(STAGING, `${noDefaults}\n${schema}\n;\nreset all;\n${authStorage}\n;\n${HISTORY_TABLE}\n${record('000', 'schema_baseline')}`, { write: true })
  console.log(`  ✓ schéma de référence (état après ${BASELINE})`)
  seed(BEFORE_MIGRATIONS)
  migrate()
  seed()
  return diff()
}

/** Donne les droits d'admin à un compte créé sur la préproduction (pour tester la relecture, les erreurs…). */
function admin(email) {
  if (!email) throw new Error('Usage : npm run staging -- admin <courriel d’un compte de la préproduction>')
  const [r] = query(
    STAGING,
    `with u as (select id from auth.users where lower(email) = lower('${email.replace(/'/g, "''")}')),
          added as (insert into public.admin_users (user_id)
                    select id from u where not exists (select 1 from public.admin_users a where a.user_id = u.id) returning user_id)
     select (select count(*) from u)::int found, (select count(*) from added)::int added`,
    { write: true }
  )
  if (!r.found) throw new Error('Aucun compte avec ce courriel sur la préproduction : inscris-toi d’abord (npm run dev:staging).')
  console.log(r.added ? 'Compte admin sur la préproduction.' : 'Ce compte était déjà admin.')
}

function functions() {
  const names = readdirSync(join(APP, 'supabase', 'functions'), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
  for (const name of names) {
    // verify_jwt : lu dans supabase/config.toml ([functions.push], [functions.ai-coach]), comme en production.
    const r = supabase(['functions', 'deploy', name, `--remote=${STAGING}`, '--use-api', '--yes'])
    if (r.status !== 0) throw new Error(`${name} : ${(r.stderr || r.stdout).trim()}`)
    console.log(`  ✓ ${name}`)
  }
  console.log('Secrets (Anthropic, R2, VAPID…) non copiés : les fonctions qui en dépendent ne marchent pas en préproduction tant qu’ils n’y sont pas ajoutés.')
}

function auth() {
  const r = supabase(['config', 'push', `--remote=${STAGING}`, '--workdir', 'staging', '--yes'])
  process.stdout.write(r.stdout)
  if (r.status !== 0) throw new Error(r.stderr.trim())
}

// ─────────────────────────────────────────────────────────────────────

const commands = { status, migrate, diff, seed: () => seed(), build, functions, auth, admin }
const [cmd, arg] = process.argv.slice(2)
if (!commands[cmd]) {
  console.log(`Usage : npm run staging -- <${Object.keys(commands).join(' | ')}>`)
  process.exit(cmd ? 1 : 0)
}
try {
  const result = commands[cmd](arg)
  if (typeof result === 'number' && result > 0) process.exitCode = 1
} catch (e) {
  console.error(`\n✗ ${e.message}`)
  process.exitCode = 1
}
