import { supabase } from './supabase'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024 // doit rester aligné avec allowed_mime_types / file_size_limit du bucket (migration 027)

function extFor(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg'
}

/**
 * Téléverse une photo de profil et retourne son URL publique.
 *
 * Chemin fixe (`avatars/<user_id>/photo.<ext>`), pas un nom horodaté : une
 * nouvelle photo remplace l'ancienne plutôt que de s'accumuler, et il n'y a
 * pas d'objet orphelin à nettoyer. `upsert: true` écrase l'existant même si
 * l'extension change (jpg → png) — un fichier de l'ancienne extension
 * pourrait rester, sans conséquence puisque seule `avatar_url` (mise à jour
 * juste après) est lue par le reste de l'app.
 */
export async function uploadAvatar(file: File): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Format non pris en charge — JPG, PNG ou WEBP seulement.')
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Image trop lourde (max 2 Mo).')
  }

  const {
    data: { user }
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const path = `${user.id}/photo.${extFor(file.type)}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: '3600'
  })
  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust : même chemin qu'avant, donc le navigateur garderait l'ancienne
  // image en cache sans ce paramètre après un remplacement.
  return `${data.publicUrl}?v=${Date.now()}`
}
