import { supabase } from './supabase'
import { getLocalUser } from './currentUser'

/**
 * Liens entre exercices (052) : variante plus dure, plus facile (le même lien
 * lu à l'envers) et adaptation quand une zone du corps fait mal. Un lien sans
 * centre vient de WODBUD ; un lien de centre vaut pour ce centre seulement.
 */
export const ZONES = ['shoulder', 'elbow', 'wrist', 'neck', 'back', 'hip', 'knee', 'ankle'] as const
export type Zone = (typeof ZONES)[number]
export type VariantKind = 'harder' | 'easier' | 'adaptation'

export interface Variant {
  linkId: string
  exerciseId: string
  name: string
  kind: VariantKind
  zone: Zone | null
  centerId: string | null
}

export async function fetchVariants(exerciseId: string): Promise<Variant[]> {
  const { data, error } = await supabase.rpc('get_exercise_variants', { p_exercise: exerciseId })
  if (error) throw error
  return (data ?? []).map((r) => ({
    linkId: r.link_id,
    exerciseId: r.exercise_id,
    name: r.name,
    kind: r.kind as VariantKind,
    zone: (r.zone as Zone | null) ?? null,
    centerId: r.center_id
  }))
}

/**
 * Relie deux exercices. « Plus facile » est enregistré comme « plus dur » à
 * l'envers, pour qu'un même lien ne soit jamais saisi deux fois.
 */
export async function addLink(input: { exerciseId: string; otherId: string; kind: VariantKind; zone?: Zone; centerId: string | null }): Promise<void> {
  const { data } = await getLocalUser()
  if (!data.user) throw new Error('not_authenticated')
  const [from, to] = input.kind === 'easier' ? [input.otherId, input.exerciseId] : [input.exerciseId, input.otherId]
  const { error } = await supabase.from('exercise_links').insert({
    from_exercise_id: from,
    to_exercise_id: to,
    kind: input.kind === 'adaptation' ? 'adaptation' : 'harder',
    zone: input.kind === 'adaptation' ? input.zone ?? null : null,
    center_id: input.centerId,
    created_by: data.user.id
  })
  if (error) throw error
}

export async function removeLink(linkId: string): Promise<void> {
  const { error } = await supabase.from('exercise_links').delete().eq('id', linkId)
  if (error) throw error
}
