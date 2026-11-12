import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

/**
 * Envoi des notifications push (migration 039).
 *
 * Deux appels possibles, chacun avec sa propre authentification — d'où
 * verify_jwt désactivé au déploiement :
 *
 * - { type: 'class', class_id, kind: 'vote' | 'plan', ref_id } : envoyé par
 *   l'app quand un coach ouvre un vote ou programme une séance. Le jeton de
 *   l'utilisateur doit être celui du coach du cours.
 * - { type: 'daily' } : envoyé chaque matin par pg_cron, avec l'en-tête
 *   x-cron-secret vérifié contre le secret stocké dans Vault.
 * - { type: 'test' } : notification de test vers ses propres appareils,
 *   depuis les paramètres (jeton de l'utilisateur).
 * - { type: 'exercise_published', exercise_id } : l'équipe WODBUD a publié
 *   l'exercice d'un centre dans la base commune ; son auteur est averti.
 * - { type: 'library_update' } : WODBUD annonce les nouveautés de la base
 *   d'exercices (7 derniers jours) à tous les abonnés.
 *   Ces deux-là : jeton d'un admin (admin_users).
 * - { type: 'invite', target_kind: 'class' | 'community', target_id, email } :
 *   inviter quelqu'un qui a déjà WODBUD (056). Jeton du coach du cours ou
 *   d'un membre de la communauté. Réponse identique que le compte existe ou
 *   non ; une notification par personne et par cible ; 30 par jour au plus.
 *
 * Un abonnement que le service push déclare expiré (404/410) est supprimé :
 * c'est un téléphone désinstallé ou une permission retirée.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

type Lang = 'fr' | 'en' | 'es'
type Payload = { title: string; body: string; url: string; tag: string }

function lang(value: string | null | undefined): Lang {
  return value === 'en' || value === 'es' ? value : 'fr'
}

function formatDate(isoDate: string, l: Lang): string {
  // Date sans heure : lue à minuit UTC et affichée en UTC, pour ne pas
  // glisser à la veille selon le fuseau du serveur.
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(l, {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  })
}

async function sendToUsers(
  admin: SupabaseClient,
  build: Map<string, (l: Lang) => Payload>
): Promise<{ sent: number; removed: number }> {
  const userIds = [...build.keys()]
  if (userIds.length === 0) return { sent: 0, removed: 0 }

  const [{ data: subs }, { data: profiles }] = await Promise.all([
    admin.from('push_subscriptions').select('id, user_id, endpoint, p256dh, auth').in('user_id', userIds),
    admin.from('profiles').select('id, language').in('id', userIds)
  ])
  const langOf = new Map((profiles ?? []).map((p) => [p.id as string, lang(p.language as string | null)]))

  let sent = 0
  let removed = 0
  await Promise.all((subs ?? []).map(async (s) => {
    const payload = build.get(s.user_id as string)!(langOf.get(s.user_id as string) ?? 'fr')
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 }
      )
      sent++
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id)
        removed++
      } else {
        console.error('push échoué', status, (err as Error).message)
      }
    }
  }))
  return { sent, removed }
}

async function daily(admin: SupabaseClient) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date())
  const { data: plans, error } = await admin
    .from('scheduled_workouts')
    .select('user_id, title')
    .eq('scheduled_date', today)
    .is('session_id', null)
  if (error) throw error

  const titlesByUser = new Map<string, string[]>()
  for (const p of plans ?? []) {
    const list = titlesByUser.get(p.user_id as string) ?? []
    list.push((p.title as string | null) ?? '')
    titlesByUser.set(p.user_id as string, list)
  }

  const build = new Map<string, (l: Lang) => Payload>()
  for (const [userId, titles] of titlesByUser) {
    const named = titles.filter(Boolean)
    build.set(userId, (l) => {
      const title = { fr: 'Séance prévue aujourd’hui', en: 'Workout planned today', es: 'Sesión prevista hoy' }[l]
      const body = titles.length === 1
        ? (named[0] || { fr: 'Ta séance t’attend.', en: 'Your workout is waiting.', es: 'Tu sesión te espera.' }[l])
        : { fr: `${titles.length} séances au programme`, en: `${titles.length} workouts planned`, es: `${titles.length} sesiones previstas` }[l]
            + (named.length ? ` : ${named.join(', ')}` : '')
      return { title, body, url: '/dashboard/journal', tag: `daily-${today}` }
    })
  }
  return sendToUsers(admin, build)
}

async function classEvent(admin: SupabaseClient, userId: string, input: { class_id?: string; kind?: string; ref_id?: string }) {
  const { class_id, kind, ref_id } = input
  if (!class_id || !ref_id || (kind !== 'vote' && kind !== 'plan')) return json({ error: 'Requête invalide' }, 400)

  const { data: cls } = await admin.from('classes').select('id, name, coach_id').eq('id', class_id).maybeSingle()
  if (!cls || cls.coach_id !== userId) return json({ error: 'Réservé au coach du cours' }, 403)

  let make: (l: Lang) => Payload
  if (kind === 'vote') {
    const { data: vote } = await admin.from('vote_sessions').select('title').eq('id', ref_id).eq('class_id', class_id).maybeSingle()
    if (!vote) return json({ error: 'Vote introuvable' }, 404)
    make = (l) => ({
      title: { fr: `Nouveau vote — ${cls.name}`, en: `New vote — ${cls.name}`, es: `Nueva votación — ${cls.name}` }[l],
      body: { fr: `Choisis le WOD : ${vote.title}`, en: `Pick the WOD: ${vote.title}`, es: `Elige el WOD: ${vote.title}` }[l],
      url: `/athlete/vote/${ref_id}`,
      tag: `vote-${ref_id}`
    })
  } else {
    const { data: plan } = await admin
      .from('class_plans')
      .select('title, scheduled_date, workouts(title)')
      .eq('id', ref_id)
      .eq('class_id', class_id)
      .maybeSingle()
    if (!plan) return json({ error: 'Séance introuvable' }, 404)
    const workout = Array.isArray(plan.workouts) ? plan.workouts[0] : plan.workouts
    const planTitle = (plan.title as string | null) ?? (workout?.title as string | undefined) ?? ''
    make = (l) => ({
      title: { fr: `${cls.name} : séance programmée`, en: `${cls.name}: workout scheduled`, es: `${cls.name}: sesión programada` }[l],
      body: [planTitle, formatDate(plan.scheduled_date as string, l)].filter(Boolean).join(' — '),
      url: '/dashboard/journal',
      tag: `plan-${ref_id}`
    })
  }

  const { data: members } = await admin.from('class_members').select('athlete_id').eq('class_id', class_id)
  const build = new Map<string, (l: Lang) => Payload>()
  for (const m of members ?? []) build.set(m.athlete_id as string, make)
  return json(await sendToUsers(admin, build))
}

const INVITES_PER_DAY = 30

async function invite(
  admin: SupabaseClient,
  userId: string,
  input: { target_kind?: string; target_id?: string; email?: string }
) {
  const { target_kind, target_id } = input
  const email = (input.email ?? '').trim()
  if ((target_kind !== 'class' && target_kind !== 'community') || !target_id || !email.includes('@') || email.length > 254) {
    return json({ error: 'Requête invalide' }, 400)
  }

  // Droits de l'invitant, nom et lien de la cible.
  let name: string
  let url: string
  if (target_kind === 'class') {
    const { data: cls } = await admin.from('classes').select('name, coach_id, invite_token').eq('id', target_id).maybeSingle()
    if (!cls || cls.coach_id !== userId) return json({ error: 'Réservé au coach du cours' }, 403)
    name = cls.name as string
    url = `/join/${cls.invite_token as string}`
  } else {
    const [{ data: com }, { data: me }] = await Promise.all([
      admin.from('communities').select('name').eq('id', target_id).maybeSingle(),
      admin.from('community_members').select('user_id').eq('community_id', target_id).eq('user_id', userId).maybeSingle()
    ])
    if (!com || !me) return json({ error: 'Réservé aux membres de la communauté' }, 403)
    name = com.name as string
    url = `/communities/${target_id}`
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin.from('invite_notifications').select('id', { count: 'exact', head: true }).eq('sender_id', userId).gte('created_at', since)
  if ((count ?? 0) >= INVITES_PER_DAY) return json({ error: 'Trop d’invitations aujourd’hui' }, 429)

  // À partir d'ici, toujours la même réponse : on ne révèle pas qui a un compte.
  const done = json({ ok: true })
  const { data: recipient } = await admin.rpc('wodbud_user_id_by_email', { p_email: email })
  if (!recipient || recipient === userId) return done

  const { data: already } = target_kind === 'class'
    ? await admin.from('class_members').select('athlete_id').eq('class_id', target_id).eq('athlete_id', recipient).maybeSingle()
    : await admin.from('community_members').select('user_id').eq('community_id', target_id).eq('user_id', recipient).maybeSingle()
  if (already) return done

  const { error: dup } = await admin.from('invite_notifications').insert({
    sender_id: userId, recipient_id: recipient, target_kind, target_id
  })
  if (dup) return done // déjà invité à cette cible : pas de deuxième notification

  const { data: sender } = await admin.from('profiles').select('full_name').eq('id', userId).maybeSingle()
  const who = ((sender?.full_name as string | null) ?? '').trim().split(/\s+/)[0] || 'WODBUD'
  const build = new Map<string, (l: Lang) => Payload>([[recipient as string, (l) => ({
    title: { fr: 'Invitation', en: 'Invitation', es: 'Invitación' }[l],
    body: target_kind === 'class'
      ? { fr: `${who} t’invite au cours « ${name} »`, en: `${who} invites you to the class “${name}”`, es: `${who} te invita a la clase «${name}»` }[l]
      : { fr: `${who} t’invite dans la communauté « ${name} »`, en: `${who} invites you to the “${name}” community`, es: `${who} te invita a la comunidad «${name}»` }[l],
    url,
    tag: `invite-${target_kind}-${target_id}`
  })]])
  await sendToUsers(admin, build)
  return done
}

async function isAdmin(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('admin_users').select('user_id').eq('user_id', userId).maybeSingle()
  return Boolean(data)
}

async function exercisePublished(admin: SupabaseClient, exerciseId: string | undefined) {
  if (!exerciseId) return json({ error: 'Requête invalide' }, 400)
  const { data: ex } = await admin
    .from('exercises')
    .select('name, created_by, review_status')
    .eq('id', exerciseId)
    .maybeSingle()
  if (!ex || ex.review_status !== 'published' || !ex.created_by) return json({ error: 'Exercice introuvable' }, 404)
  const build = new Map<string, (l: Lang) => Payload>([[ex.created_by as string, (l) => ({
    title: { fr: 'Exercice ajouté à WODBUD', en: 'Exercise added to WODBUD', es: 'Ejercicio añadido a WODBUD' }[l],
    body: {
      fr: `« ${ex.name} » fait maintenant partie de la base commune. Merci !`,
      en: `“${ex.name}” is now part of the shared library. Thank you!`,
      es: `«${ex.name}» ya forma parte de la base común. ¡Gracias!`
    }[l],
    url: '/dashboard/exercises',
    tag: `exercise-${exerciseId}`
  })]])
  return json(await sendToUsers(admin, build))
}

async function libraryUpdate(admin: SupabaseClient) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const [{ count: published }, { count: created }] = await Promise.all([
    admin.from('exercises').select('id', { count: 'exact', head: true }).eq('review_status', 'published').gte('published_at', since),
    admin.from('exercises').select('id', { count: 'exact', head: true }).is('center_id', null).is('review_status', null).gte('created_at', since)
  ])
  const total = (published ?? 0) + (created ?? 0)
  if (total === 0) return json({ exercises: 0, sent: 0, removed: 0 })

  const { data: subs } = await admin.from('push_subscriptions').select('user_id')
  const build = new Map<string, (l: Lang) => Payload>()
  for (const s of subs ?? []) {
    build.set(s.user_id as string, (l) => ({
      title: { fr: 'Nouveautés dans la base d’exercices', en: 'New in the exercise library', es: 'Novedades en la base de ejercicios' }[l],
      body: {
        fr: `${total} nouvel${total > 1 ? 's' : ''} exercice${total > 1 ? 's' : ''} cette semaine.`,
        en: `${total} new exercise${total > 1 ? 's' : ''} this week.`,
        es: `${total} ejercicio${total > 1 ? 's' : ''} nuevo${total > 1 ? 's' : ''} esta semana.`
      }[l],
      url: '/dashboard/exercises',
      tag: `library-${since.slice(0, 10)}`
    }))
  }
  return json({ exercises: total, ...(await sendToUsers(admin, build)) })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Méthode non permise' }, 405)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false }
  })
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  )

  const body = await req.json().catch(() => ({}))

  try {
    if (body.type === 'daily') {
      const secret = req.headers.get('x-cron-secret') ?? ''
      const { data: ok } = await admin.rpc('wodbud_check_push_cron_secret', { p_secret: secret })
      if (ok !== true) return json({ error: 'Interdit' }, 403)
      return json(await daily(admin))
    }

    if (body.type === 'exercise_published' || body.type === 'library_update') {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data: { user } } = await admin.auth.getUser(token)
      if (!user) return json({ error: 'Non authentifié' }, 401)
      if (!(await isAdmin(admin, user.id))) return json({ error: 'Réservé à WODBUD' }, 403)
      return body.type === 'exercise_published'
        ? await exercisePublished(admin, body.exercise_id)
        : await libraryUpdate(admin)
    }

    if (body.type === 'class' || body.type === 'test' || body.type === 'invite') {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data: { user } } = await admin.auth.getUser(token)
      if (!user) return json({ error: 'Non authentifié' }, 401)
      if (body.type === 'class') return await classEvent(admin, user.id, body)
      if (body.type === 'invite') return await invite(admin, user.id, body)

      const build = new Map<string, (l: Lang) => Payload>([[user.id, (l) => ({
        title: 'WODBUD',
        body: { fr: 'Les notifications fonctionnent sur cet appareil.', en: 'Notifications work on this device.', es: 'Las notificaciones funcionan en este dispositivo.' }[l],
        url: '/dashboard/settings',
        tag: 'test'
      })]])
      return json(await sendToUsers(admin, build))
    }

    return json({ error: 'Requête invalide' }, 400)
  } catch (err) {
    console.error(err)
    return json({ error: (err as Error).message }, 500)
  }
})
