// @ts-ignore Edge Function Deno remote import
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.17'
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

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Secrets Supabase manquants' }), {
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

    const { key } = await req.json()

    if (!key || typeof key !== 'string') {
      return new Response(JSON.stringify({ error: 'Cle R2 manquante' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const bucket = Deno.env.get('R2_BUCKET_NAME')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
      return new Response(JSON.stringify({ error: 'Secrets R2 manquants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3'
    })

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`
    const signedRequest = await r2.sign(new Request(endpoint, { method: 'DELETE' }))

    const deleteResponse = await fetch(signedRequest)
    if (!deleteResponse.ok) {
      return new Response(JSON.stringify({ error: `Suppression R2 echouee (${deleteResponse.status})` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('r2-delete error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
