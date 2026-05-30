import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.17'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { exerciseId, fileName, contentType, fileSize } = await req.json()

    if (!exerciseId || !fileName || !contentType) {
      return new Response(JSON.stringify({ error: 'Parametres manquants' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (fileSize > 200 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Fichier trop lourd (max 200MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']
    if (!allowedTypes.includes(contentType)) {
      return new Response(JSON.stringify({ error: 'Type de fichier non autorise' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const accountId = Deno.env.get('R2_ACCOUNT_ID')
    const accessKeyId = Deno.env.get('R2_ACCESS_KEY_ID')
    const secretAccessKey = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const bucket = Deno.env.get('R2_BUCKET_NAME')
    const publicBaseUrl = Deno.env.get('R2_PUBLIC_URL')

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicBaseUrl) {
      return new Response(JSON.stringify({ error: 'Secrets R2 manquants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ext = fileName.split('.').pop() || 'mp4'
    const key = `exercises/${exerciseId}/${Date.now()}.${ext}`

    const r2 = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: 'auto',
      service: 's3'
    })

    const endpoint = `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`

    const presignedUrl = await r2.sign(new Request(endpoint, { method: 'PUT' }), {
      aws: { signQuery: true },
      headers: { 'Content-Type': contentType },
      expiresIn: 600
    })

    const publicUrl = `${publicBaseUrl}/${key}`

    return new Response(JSON.stringify({ presignedUrl: presignedUrl.url, publicUrl, key }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('r2-presign error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
