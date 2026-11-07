import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Lecture d'une feuille d'entraînement (photo, ou page de PDF déjà rendue en
 * image côté client) par Claude.
 *
 * La clé Anthropic vit ici, pas dans le bundle client : une variable VITE_*
 * finit dans le JavaScript servi à tout le monde. Accès : JWT vérifié, puis
 * appartenance à `admin_users` — ou rôle de proprio / entraîneur chef du
 * centre passé en `center_id` (import des exercices d'un centre, 050).
 *
 * Un seul fichier par appel : le client garde la progression et la reprise
 * fichier par fichier en cas d'échec partiel d'un lot.
 *
 * Modèle : Claude Haiku 5.5 par défaut (rapide, environ 0,0005 $ la feuille).
 * Si l'écriture à la main est mal lue, poser le secret CLAUDE_OCR_MODEL à
 * `claude-sonnet-5-5` suffit — sans redéployer.
 */

const DEFAULT_MODEL = 'claude-haiku-5-5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const CATEGORIES = ['strength', 'olympic', 'gymnastics', 'cardio', 'mobility', 'accessory']
const MUSCLES = [
  'chest', 'back', 'traps', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'obliques', 'lower_back',
  'glutes', 'quads', 'hamstrings', 'adductors', 'calves', 'tibialis', 'cardio_upper', 'cardio_lower'
]

// Sortie structurée : la réponse respecte toujours ce schéma, plus besoin de
// chercher un tableau JSON dans du texte libre.
const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          category: { type: 'string', enum: CATEGORIES },
          primary_muscle: { type: 'string', enum: MUSCLES },
          description: { type: 'string' },
          occurrences: { type: 'integer' }
        },
        required: ['name', 'category', 'primary_muscle', 'description', 'occurrences'],
        additionalProperties: false
      }
    }
  },
  required: ['exercises'],
  additionalProperties: false
}

const PROMPT = `Voici une feuille d'entraînement (CrossFit, haltérophilie, fitness), imprimée ou écrite à la main.

Relève chaque exercice mentionné, une seule fois chacun :
- name : le nom de l'exercice tel qu'un coach l'écrirait, corrigé s'il est mal orthographié (« Trusters » devient « Thrusters »), sans charges, répétitions ni séries.
- category : strength (force, charges), olympic (haltérophilie), gymnastics (poids du corps, gymnastique), cardio (endurance, course, rameur), mobility (mobilité, étirements), accessory (accessoire).
- primary_muscle : le muscle principal sollicité.
- description : une phrase courte en français sur l'exécution, ou une chaîne vide si tu n'es pas sûr.
- occurrences : combien de fois l'exercice revient sur la feuille (chaque séance, bloc ou ligne où il apparaît ; au moins 1). Ne compte pas les répétitions ni les séries.

Ignore les dates, les noms de personnes, les temps et les scores. Si la feuille ne contient aucun exercice, renvoie une liste vide.`

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type ImageType = (typeof IMAGE_TYPES)[number]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Authentification requise' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'Secrets Supabase manquants' }, 500)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: { user }, error: userError } = await adminClient.auth.getUser(token)
    if (userError || !user) return json({ error: 'Session invalide' }, 401)

    const { base64, mimeType, center_id: centerId } = await req.json()

    const { data: adminRow } = await adminClient.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle()
    let allowed = Boolean(adminRow)
    if (!allowed && typeof centerId === 'string' && centerId) {
      const { data: member } = await adminClient
        .from('center_members')
        .select('role')
        .eq('center_id', centerId)
        .eq('user_id', user.id)
        .maybeSingle()
      allowed = member?.role === 'owner' || member?.role === 'head_coach'
    }
    if (!allowed) return json({ error: 'Acces admin ou entraineur chef requis' }, 403)

    if (!base64 || !mimeType) return json({ error: 'Parametres manquants' }, 400)
    const isPdf = mimeType === 'application/pdf'
    if (!isPdf && !IMAGE_TYPES.includes(mimeType)) return json({ error: `Format non pris en charge : ${mimeType}` }, 400)
    // ~25 Mo en base64 : large pour une feuille, sans laisser passer une
    // photo oubliée en pleine résolution.
    if (base64.length > 34_000_000) return json({ error: 'Fichier trop lourd (max ~25 Mo)' }, 400)

    // Après les droits : une personne sans accès n'apprend rien de la configuration.
    if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'Secret ANTHROPIC_API_KEY manquant' }, 500)

    // 429 et 5xx sont repris par le SDK (attente croissante) : avaler des
    // années de feuilles d'un coup peut toucher la limite par minute.
    const client = new Anthropic({ maxRetries: 4 })
    const source = isPdf
      ? { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } }
      : { type: 'image' as const, source: { type: 'base64' as const, media_type: mimeType as ImageType, data: base64 } }

    const response = await client.messages.create({
      model: Deno.env.get('CLAUDE_OCR_MODEL') || DEFAULT_MODEL,
      max_tokens: 16000,
      // Relever une liste n'est pas un problème de raisonnement : effort bas.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [{ role: 'user', content: [source, { type: 'text', text: PROMPT }] }]
    })

    if (response.stop_reason === 'refusal') return json({ error: 'Feuille refusée par le modèle' }, 422)
    if (response.stop_reason === 'max_tokens') return json({ error: 'Feuille trop chargée : coupe-la en plusieurs photos' }, 422)

    const text = response.content.find((b) => b.type === 'text')
    const parsed = text?.type === 'text' ? JSON.parse(text.text) : { exercises: [] }
    return json({ rows: parsed.exercises ?? [] })
  } catch (err) {
    console.error('ocr-import error:', err)
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'Trop de feuilles d’un coup : réessaie dans une minute' }, 429)
    if (err instanceof Anthropic.APIError) return json({ error: `Erreur Claude (${err.status ?? '?'}) : ${err.message}` }, 502)
    return json({ error: err instanceof Error ? err.message : 'Erreur serveur' }, 500)
  }
})
