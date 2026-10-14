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

    if (body.type === 'class' || body.type === 'test') {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data: { user } } = await admin.auth.getUser(token)
      if (!user) return json({ error: 'Non authentifié' }, 401)
      if (body.type === 'class') return await classEvent(admin, user.id, body)

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
