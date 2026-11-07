import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Photo ou courte vidéo de référence jointe à un exercice de centre (049) :
 * elle montre le mouvement à l'équipe WODBUD, qui tourne ensuite la vidéo
 * officielle. Privée (compartiment fermé, liens signés d'une heure), et
 * supprimée une fois l'exercice relu.
 *
 * Tout est réduit sur le téléphone avant l'envoi : une vidéo de téléphone
 * pèse 100 Mo et plus la minute, ramenée en 720p elle tient sous ~20 Mo.
 */
const BUCKET = 'exercise-references'
export const MAX_REFERENCES = 3
export const MAX_VIDEO_SECONDS = 60
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024
/** Sous ce poids, une vidéo part telle quelle : la réencoder coûterait plus qu'elle ne rapporte. */
const KEEP_VIDEO_BELOW = 20 * 1024 * 1024

export type ReferenceKind = 'photo' | 'video'

export interface PreparedReference {
  blob: Blob
  kind: ReferenceKind
  ext: string
}

export interface ExerciseReference {
  id: string
  kind: ReferenceKind
  path: string
  url: string | null
}

export class ReferenceMediaError extends Error {
  code: 'too_long' | 'too_big' | 'unsupported' | 'unreadable'
  constructor(code: ReferenceMediaError['code']) {
    super(code)
    this.code = code
  }
}

export const referenceKind = (file: File): ReferenceKind | null =>
  file.type.startsWith('image/') ? 'photo' : file.type.startsWith('video/') ? 'video' : null

// ─── Photo : JPEG, 1600 px au plus ──────────────────────────────────

async function preparePhoto(file: File): Promise<PreparedReference> {
  const bitmap = await createImageBitmap(file).catch(() => { throw new ReferenceMediaError('unreadable') })
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
  if (!blob) throw new ReferenceMediaError('unreadable')
  return { blob, kind: 'photo', ext: 'jpg' }
}

// ─── Vidéo : 60 s au plus, réencodée en 720p si elle est lourde ─────

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve({ video, url })
    video.onerror = () => { URL.revokeObjectURL(url); reject(new ReferenceMediaError('unreadable')) }
  })
}

function pickRecorderType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null
}

/**
 * Rejoue la vidéo dans un canevas 720p et l'enregistre (sans le son) :
 * prend la durée de la vidéo, l'écran doit rester ouvert.
 */
async function reencode(video: HTMLVideoElement, mimeType: string, onProgress?: (p: number) => void): Promise<Blob> {
  const scale = Math.min(1, 720 / Math.min(video.videoWidth, video.videoHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round((video.videoWidth * scale) / 2) * 2
  canvas.height = Math.round((video.videoHeight * scale) / 2) * 2
  const ctx = canvas.getContext('2d')!
  const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 2_500_000 })
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const stopped = new Promise<void>((r) => { recorder.onstop = () => r() })

  recorder.start(1000)
  await video.play()
  await new Promise<void>((resolve) => {
    const draw = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      onProgress?.(Math.min(1, video.currentTime / (video.duration || 1)))
      if (video.ended) resolve()
      else requestAnimationFrame(draw)
    }
    video.onended = () => resolve()
    requestAnimationFrame(draw)
  })
  recorder.stop()
  await stopped
  return new Blob(chunks, { type: mimeType.split(';')[0] })
}

async function prepareVideo(file: File, onProgress?: (p: number) => void): Promise<PreparedReference> {
  const { video, url } = await loadVideo(file)
  try {
    if (video.duration > MAX_VIDEO_SECONDS + 1) throw new ReferenceMediaError('too_long')
    const extOf = (type: string) => (type.includes('mp4') ? 'mp4' : type.includes('quicktime') ? 'mov' : 'webm')
    if (file.size <= KEEP_VIDEO_BELOW) return { blob: file, kind: 'video', ext: extOf(file.type) }
    const mime = pickRecorderType()
    if (!mime) {
      if (file.size > MAX_UPLOAD_BYTES) throw new ReferenceMediaError('too_big')
      return { blob: file, kind: 'video', ext: extOf(file.type) }
    }
    const blob = await reencode(video, mime, onProgress)
    if (blob.size > MAX_UPLOAD_BYTES) throw new ReferenceMediaError('too_big')
    return { blob, kind: 'video', ext: extOf(mime) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function prepareReference(file: File, onProgress?: (p: number) => void): Promise<PreparedReference> {
  const kind = referenceKind(file)
  if (kind === 'photo') return preparePhoto(file)
  if (kind === 'video') return prepareVideo(file, onProgress)
  throw new ReferenceMediaError('unsupported')
}

/** Vérifie la durée dès le choix du fichier, avant tout envoi. */
export async function checkReference(file: File): Promise<void> {
  const kind = referenceKind(file)
  if (!kind) throw new ReferenceMediaError('unsupported')
  if (kind === 'video') {
    const { video, url } = await loadVideo(file)
    URL.revokeObjectURL(url)
    if (video.duration > MAX_VIDEO_SECONDS + 1) throw new ReferenceMediaError('too_long')
  }
}

// ─── Envoi, lecture, suppression ────────────────────────────────────

export async function uploadReferences(
  exerciseId: string,
  files: File[],
  onProgress?: (index: number, phase: 'compress' | 'upload', p: number) => void
): Promise<void> {
  const { data } = await getLocalUser()
  const userId = data.user?.id
  if (!userId) throw new Error('not_authenticated')

  for (const [i, file] of files.entries()) {
    const prepared = await prepareReference(file, (p) => onProgress?.(i, 'compress', p))
    onProgress?.(i, 'upload', 0)
    const path = `${exerciseId}/${crypto.randomUUID()}.${prepared.ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, prepared.blob, {
      contentType: prepared.blob.type || (prepared.kind === 'photo' ? 'image/jpeg' : 'video/mp4'),
      upsert: false
    })
    if (upErr) throw upErr
    const { error: rowErr } = await supabase
      .from('exercise_references')
      .insert({ exercise_id: exerciseId, path, kind: prepared.kind, created_by: userId })
    if (rowErr) {
      await supabase.storage.from(BUCKET).remove([path])
      throw rowErr
    }
    onProgress?.(i, 'upload', 1)
  }
}

export async function listReferences(exerciseId: string): Promise<ExerciseReference[]> {
  const { data, error } = await supabase
    .from('exercise_references')
    .select('id, kind, path')
    .eq('exercise_id', exerciseId)
    .order('created_at')
  if (error) throw error
  const rows = data ?? []
  if (!rows.length) return []
  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.path), 3600)
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]))
  return rows.map((r) => ({ id: r.id, kind: r.kind as ReferenceKind, path: r.path, url: urlOf.get(r.path) ?? null }))
}

/** Après la relecture : les médias de référence n'ont plus de raison d'être gardés. */
export async function deleteReferences(exerciseId: string): Promise<void> {
  const { data, error } = await supabase.from('exercise_references').select('path').eq('exercise_id', exerciseId)
  if (error) throw error
  const paths = (data ?? []).map((r) => r.path)
  if (!paths.length) return
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(paths)
  if (rmErr) throw rmErr
  const { error: delErr } = await supabase.from('exercise_references').delete().eq('exercise_id', exerciseId)
  if (delErr) throw delErr
}
