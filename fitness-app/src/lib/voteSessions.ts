import type { VoteSession } from '../types'

/**
 * Ouverture effective d'une session de vote.
 *
 * `status` dit si le coach l'a fermée à la main ; `deadline` dit si elle a
 * expiré toute seule. Les deux ferment le vote, mais pas pour la même
 * raison — l'interface les distingue (« Fermé » vs « Expiré ») pour que le
 * coach comprenne pourquoi une session ne prend plus de votes sans avoir eu
 * à cliquer sur rien.
 *
 * `deadline` est un `timestamptz`, mais le formulaire n'envoie qu'une date
 * (`<input type="date">`) : Postgres la stocke comme minuit UTC ce jour-là.
 * Comparer directement à `now()` fermerait le vote en pleine journée locale
 * (minuit UTC = la veille au soir au Québec). On ajoute donc 24h de marge
 * pour garder la journée choisie ouverte en entier — logique reprise à
 * l'identique côté RLS dans la migration 024, les deux doivent rester en
 * phase.
 */
const DEADLINE_GRACE_MS = 24 * 60 * 60 * 1000

export function isVoteExpired(session: Pick<VoteSession, 'deadline'>): boolean {
  if (!session.deadline) return false
  return Date.now() >= new Date(session.deadline).getTime() + DEADLINE_GRACE_MS
}

/** Vote qui accepte encore des voix — ni fermé par le coach, ni expiré. */
export function isVoteSessionOpen(session: Pick<VoteSession, 'status' | 'deadline'>): boolean {
  return session.status === 'open' && !isVoteExpired(session)
}

export type VoteSessionKind = 'open' | 'expired' | 'closed'

/**
 * Distingue « le coach a cliqué Fermer » de « la date est passée toute
 * seule » — même état côté vote, mais pas la même explication à donner au
 * coach ou à l'athlète.
 */
export function voteSessionKind(session: Pick<VoteSession, 'status' | 'deadline'>): VoteSessionKind {
  if (session.status === 'closed') return 'closed'
  return isVoteExpired(session) ? 'expired' : 'open'
}
