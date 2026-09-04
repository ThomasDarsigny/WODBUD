import i18n from '../i18n'
import { supabase } from './supabase'

export interface R2UploadResult {
  url: string
  /** Chemin de l'objet dans le bucket. À conserver : c'est la seule façon de le supprimer plus tard. */
  key: string
}

/**
 * Le stockage vidéo n'est pas encore branché côté serveur (secrets R2 absents).
 * Distinct d'une vraie panne : l'appelant peut choisir de continuer sans vidéo
 * plutôt que de perdre l'exercice que l'utilisateur vient de remplir.
 */
export class R2NotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'R2NotConfiguredError'
  }
}

/**
 * `functions.invoke` ne lève pas sur un statut non-2xx : il renvoie une erreur
 * dont le message est générique (« non-2xx status code »). Le vrai message est
 * dans le corps de la réponse, accessible via `context`.
 */
async function readFunctionError(error: unknown): Promise<string | null> {
  const source = error as { context?: unknown; response?: unknown } | null
  // `context` aujourd'hui, `response` sur d'autres versions de la lib.
  const raw = source?.context ?? source?.response
  if (!(raw instanceof Response)) return null
  try {
    const body = (await raw.clone().json()) as { error?: unknown }
    return typeof body.error === 'string' ? body.error : null
  } catch {
    return null
  }
}

/** Traduit les messages renvoyés par les Edge Functions en erreurs exploitables. */
function toAppError(raw: string | null, fallback: string): Error {
  if (raw === 'Secrets R2 manquants') {
    return new R2NotConfiguredError(
      i18n.t('errors.video_storage_not_configured', { ns: 'exercises' })
    )
  }
  if (raw === 'Acces admin requis') {
    return new Error(i18n.t('errors.video_admin_required', { ns: 'exercises' }))
  }
  return new Error(raw ?? fallback)
}

/**
 * Téléverse une vidéo vers R2 via une presigned URL générée par l'Edge Function.
 * Le fichier ne transite jamais par Supabase : le navigateur écrit directement
 * dans le bucket.
 */
export async function uploadVideoToR2(
  file: File,
  exerciseId: string,
  onProgress?: (pct: number) => void
): Promise<R2UploadResult> {
  const { data, error } = await supabase.functions.invoke('r2-presign', {
    body: {
      exerciseId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size
    }
  })

  if (error) throw toAppError(await readFunctionError(error), `Presign failed: ${error.message}`)

  const { presignedUrl, publicUrl, key } = data as {
    presignedUrl: string
    publicUrl: string
    key: string
  }

  await uploadWithProgress(file, presignedUrl, onProgress)

  return { url: publicUrl, key }
}

/**
 * Supprime une vidéo R2. Tolérant à l'objet déjà absent : le but est qu'il ne
 * soit plus là, pas qu'on l'ait supprimé soi-même.
 */
export async function deleteVideoFromR2(key: string): Promise<void> {
  const { error } = await supabase.functions.invoke('r2-delete', { body: { key } })
  if (!error) return

  const raw = await readFunctionError(error)
  if (raw?.includes('(404)')) return

  throw toAppError(raw, `Delete failed: ${error.message}`)
}

function uploadWithProgress(
  file: File,
  presignedUrl: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`R2 upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    // Un PUT bloqué par le CORS du bucket arrive ici, sans statut : le navigateur
    // ne laisse rien filtrer de la réponse. C'est la panne la plus probable tant
    // que la politique CORS du bucket n'est pas posée.
    xhr.addEventListener('error', () =>
      reject(new Error(i18n.t('errors.video_upload_network', { ns: 'exercises' })))
    )
    xhr.addEventListener('abort', () => reject(new Error('Upload annule')))

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
