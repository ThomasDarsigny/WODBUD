import { supabase } from './supabase'

export interface R2UploadResult {
  url: string
  key: string
}

/**
 * Upload une video vers R2 via une presigned URL generee par l'Edge Function.
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

  if (error) throw new Error(`Presign failed: ${error.message}`)

  const { presignedUrl, publicUrl, key } = data as {
    presignedUrl: string
    publicUrl: string
    key: string
  }

  await uploadWithProgress(file, presignedUrl, onProgress)

  return { url: publicUrl, key }
}

/**
 * Supprime une video R2 via l'Edge Function.
 */
export async function deleteVideoFromR2(key: string): Promise<void> {
  const { error } = await supabase.functions.invoke('r2-delete', {
    body: { key }
  })
  if (error) throw new Error(`Delete failed: ${error.message}`)
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

    xhr.addEventListener('error', () => reject(new Error("Erreur reseau lors de l'upload")))
    xhr.addEventListener('abort', () => reject(new Error('Upload annule')))

    xhr.open('PUT', presignedUrl)
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.send(file)
  })
}
