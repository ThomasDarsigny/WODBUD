// @ts-ignore Edge Function Deno remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void
  env: {
    get(name: string): string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

/**
 * Analyse OCR d'une feuille d'entraînement (image ou page de PDF déjà rendue
 * en image côté client) via Gemini.
 *
 * La clé Gemini vit ici, pas dans le bundle client : un VITE_GEMINI_API_KEY
 * finit dans le JavaScript servi à tout le monde, donc lisible et volable par
 * n'importe qui. Même patron que r2-presign : JWT vérifié, puis appartenance
 * à `admin_users`.
 *
 * Un seul fichier par appel — le client garde le contrôle de la progression
 * et de la reprise par fichier en cas d'échec partiel d'un lot.
 */

const DEFAULT_MODEL = 'gemini-3.5-flash'

const OCR_PROMPT = `Analyse cette feuille d'entraînement CrossFit/fitness. Extrait TOUS les exercices mentionnés.

Réponds UNIQUEMENT avec un tableau JSON valide (pas de markdown, pas de texte autour).

Format exact :
[{"name":"Nom exercice","category":"strength","primary_muscle":"core","description":"Description courte en français"}]

Valeurs de category : strength (force/charges), olympic (haltérophilie/mouvements olympiques), gymnastics (gymnastic/corps), cardio (endurance/course), mobility (mobilité/étirements), accessory (accessoire).
Valeurs de primary_muscle : chest, back, traps, shoulders, biceps, triceps, forearms, core, obliques, lower_back, glutes, quads, hamstrings, adductors, calves, tibialis, cardio_upper, cardio_lower.

Si aucun exercice trouvé, retourne [].`

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Gemini répond parfois 429 (quota par minute) ou 503 (surcharge) sous
 * volume — attendu ici puisque le but est d'avaler des années de feuilles
 * d'un coup. On retente avec un backoff plutôt que de faire échouer le
 * fichier et d'obliger un import manuel.
 */
async function callGeminiWithRetry(
  apiKey: string,
  model: string,
  base64: string,
  mimeType: string,
  attempts = 4
): Promise<unknown> {
  let lastError: Error = new Error('Echec Gemini')

  for (let i = 0; i < attempts; i++) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { mimeType, data: base64 } }, { text: OCR_PROMPT }] }],
          generationConfig: { temperature: 0.1 }
        })
      }
    )

    if (res.ok) return res.json()

    const retryable = res.status === 429 || res.status >= 500
    const body = await res.json().catch(() => ({}))
    const detail = (body as { error?: { message?: string } })?.error?.message
    lastError = new Error(detail ?? `Erreur API Gemini (${res.status})`)

    if (!retryable || i === attempts - 1) throw lastError
    await sleep(500 * 2 ** i) // 500ms, 1s, 2s
  }

  throw lastError
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim()

    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    const model = Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Secrets Supabase manquants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'Secret GEMINI_API_KEY manquant' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const {
      data: { user },
      error: userError
    } = await adminClient.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: adminRow, error: adminError } = await adminClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (adminError || !adminRow) {
      return new Response(JSON.stringify({ error: 'Acces admin requis' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { base64, mimeType } = await req.json()
    if (!base64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Parametres manquants' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ~25MB en base64 : large pour une feuille scannée, sans exposer la
    // fonction à un fichier oublié en pleine résolution photo.
    if (base64.length > 34_000_000) {
      return new Response(JSON.stringify({ error: 'Image trop lourde (max ~25MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = (await callGeminiWithRetry(geminiKey, model, base64, mimeType)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    const rows = jsonMatch ? JSON.parse(jsonMatch[0]) : []

    return new Response(JSON.stringify({ rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('ocr-import error:', err)
    const message = err instanceof Error ? err.message : 'Erreur serveur'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
