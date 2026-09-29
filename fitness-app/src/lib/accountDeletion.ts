import { supabase } from './supabase'
import { readFunctionErrorMessage } from './edgeFunctionError'

export interface DeletionImpact {
  classesOwned: number
  athletesAffected: number
  votesSessionsOwned: number
  workoutsCreated: number
  sessionsLogged: number
  scheduledCount: number
}

async function call(confirm: boolean): Promise<{ impact?: DeletionImpact; deleted?: boolean }> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm } })
  if (error) {
    const detail = await readFunctionErrorMessage(error)
    throw new Error(detail ?? error.message ?? 'Erreur')
  }
  return data as { impact?: DeletionImpact; deleted?: boolean }
}

/** Ce qui va disparaître — à afficher avant de demander confirmation. */
export async function previewAccountDeletion(): Promise<DeletionImpact> {
  const { impact } = await call(false)
  if (!impact) throw new Error('Réponse inattendue')
  return impact
}

/** Supprime réellement le compte. Irréversible : appeler seulement après confirmation explicite. */
export async function confirmAccountDeletion(): Promise<void> {
  await call(true)
}
