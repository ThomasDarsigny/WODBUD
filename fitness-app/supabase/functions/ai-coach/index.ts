import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { message, history } = (await req.json()) as { message: string; history: Message[] }

    // Fetch all exercises with muscle groups
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: exercises, error: exError } = await serviceClient
      .from('exercises')
      .select('name, description, category, exercise_muscles(role, muscle_groups(name_key))')
      .order('name', { ascending: true })

    if (exError) throw exError

    const exerciseLines = ((exercises ?? []) as any[]).map((ex) => {
      const primary = ex.exercise_muscles?.find((m: any) => m.role === 'primary')?.muscle_groups?.name_key
      const secondary = (ex.exercise_muscles ?? [])
        .filter((m: any) => m.role === 'secondary')
        .map((m: any) => m.muscle_groups?.name_key)
        .filter(Boolean)

      const muscles = primary
        ? `muscle principal: ${primary}${secondary.length ? `, secondaires: ${secondary.join(', ')}` : ''}`
        : ''
      const desc = ex.description ? ` — ${ex.description}` : ''
      return `• ${ex.name} [${ex.category}]${muscles ? ` (${muscles})` : ''}${desc}`
    })

    const systemPrompt = `Tu es un coach fitness expert et assistant IA intégré à l'application ForgeX. Tu aides les coachs à concevoir des séances d'entraînement efficaces et personnalisées.

Bibliothèque d'exercices disponibles dans l'application:
${exerciseLines.join('\n')}

Règles:
- Réponds toujours en français
- Sois concis, direct et pratique
- Quand tu proposes des exercices, utilise exactement les noms de la bibliothèque ci-dessus
- Si un exercice pertinent n'est pas dans la bibliothèque, signale-le clairement
- Pour les programmes, précise sets/reps/repos quand c'est pertinent
- Adapte tes recommandations au contexte CrossFit/functional fitness de ForgeX`

    const messages = [...(history ?? []), { role: 'user', content: message }]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages
      })
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Anthropic API error: ${err}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text ?? ''

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
