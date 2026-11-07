import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

/**
 * Assistant IA du coach (Claude). La clé Anthropic reste côté serveur.
 *
 * Les exercices proposés sont lus avec les droits de la personne connectée :
 * la base commune et ceux de son centre, jamais les exercices privés d'un
 * autre centre (049).
 */

const MODEL = 'claude-haiku-5-5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

type ExerciseRow = {
  name: string
  description: string | null
  category: string
  exercise_muscles: Array<{ role: string; muscle_groups: { name_key: string } | null }> | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !anonKey) return json({ error: 'Secrets Supabase manquants' }, 500)

    // Client aux droits de la personne : vérifie le jeton et applique les
    // règles d'accès aux exercices.
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    if (!Deno.env.get('ANTHROPIC_API_KEY')) return json({ error: 'Secret ANTHROPIC_API_KEY manquant' }, 500)

    const { message, history } = (await req.json()) as { message: string; history?: Anthropic.MessageParam[] }
    if (typeof message !== 'string' || !message.trim()) return json({ error: 'Message vide' }, 400)

    const { data: exercises, error: exError } = await userClient
      .from('exercises')
      .select('name, description, category, exercise_muscles(role, muscle_groups(name_key))')
      .order('name', { ascending: true })
    if (exError) throw exError

    const exerciseLines = ((exercises ?? []) as unknown as ExerciseRow[]).map((ex) => {
      const muscles = ex.exercise_muscles ?? []
      const primary = muscles.find((m) => m.role === 'primary')?.muscle_groups?.name_key
      const secondary = muscles.filter((m) => m.role === 'secondary').map((m) => m.muscle_groups?.name_key).filter(Boolean)
      const muscleText = primary
        ? `muscle principal: ${primary}${secondary.length ? `, secondaires: ${secondary.join(', ')}` : ''}`
        : ''
      const desc = ex.description ? ` — ${ex.description}` : ''
      return `• ${ex.name} [${ex.category}]${muscleText ? ` (${muscleText})` : ''}${desc}`
    })

    const systemPrompt = `Tu es un coach fitness expert et assistant IA intégré à l'application WODBUD. Tu aides les coachs à concevoir des séances d'entraînement efficaces et personnalisées.

Bibliothèque d'exercices disponibles dans l'application:
${exerciseLines.join('\n')}

Règles:
- Réponds dans la langue de la question (français, anglais ou espagnol)
- Sois concis, direct et pratique
- Quand tu proposes des exercices, utilise exactement les noms de la bibliothèque ci-dessus
- Si un exercice pertinent n'est pas dans la bibliothèque, signale-le clairement
- Pour les programmes, précise sets/reps/repos quand c'est pertinent
- Adapte tes recommandations au contexte CrossFit/functional fitness de WODBUD`

    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      // Assez de place pour la réflexion du modèle (activée par défaut) et la réponse.
      max_tokens: 8000,
      system: systemPrompt,
      messages: [...(history ?? []), { role: 'user', content: message }]
    })

    if (response.stop_reason === 'refusal') {
      return json({ content: 'Je ne peux pas répondre à cette demande. Reformule-la autrement.' })
    }

    // La réflexion arrive dans ses propres blocs : on ne garde que le texte.
    const content = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    return json({ content })
  } catch (error) {
    console.error('ai-coach error:', error)
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Trop de demandes : réessaie dans un instant' }, 429)
    if (error instanceof Anthropic.APIError) return json({ error: `Erreur Claude (${error.status ?? '?'})` }, 502)
    return json({ error: error instanceof Error ? error.message : 'Internal error' }, 500)
  }
})
