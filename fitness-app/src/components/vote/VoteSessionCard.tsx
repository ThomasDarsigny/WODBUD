import { useTranslation } from 'react-i18next'
import type { VoteResult, VoteSession } from '../../types'
import { isVoteSessionOpen, voteSessionKind } from '../../lib/voteSessions'
import ConfirmButton from '../ui/ConfirmButton'
import VoteResultsBars from './VoteResultsBars'

/**
 * Carte d'un vote côté coach : titre, état, total, échéance, résultats, et
 * les actions (rafraîchir, fermer, supprimer). Partagée par l'onglet Votes
 * d'un cours et la page Votes (4.2) — elles en avaient chacune une copie.
 */
export default function VoteSessionCard({ session, results, courseName, onRefresh, onClose, onDelete }: {
  session: VoteSession
  results: VoteResult[]
  /** Nom du cours, affiché quand la liste mélange plusieurs cours. */
  courseName?: string
  onRefresh: () => void
  onClose: () => void
  onDelete: () => void | Promise<void>
}) {
  const { t } = useTranslation('common')
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0)
  const open = isVoteSessionOpen(session)
  const kind = voteSessionKind(session)

  return (
    <article className="wb-vote-session" aria-label={session.title}>
      <div className="wb-vote-session-head">
        <div>
          <div className="wb-vote-session-title">
            <strong>{session.title}</strong>
            <span className={`wb-vote-status${open ? ' is-open' : ''}`}>
              {kind === 'open' ? t('classes.vote_open') : kind === 'expired' ? t('classes.vote_expired') : t('classes.vote_closed')}
            </span>
            {totalVotes > 0 && <span className="wb-vote-total">{totalVotes} {t('classes.votes_total')}</span>}
          </div>
          {(courseName || session.deadline) && (
            <p className="wb-vote-session-meta">
              {courseName && <span className="wb-vote-session-course">{courseName}</span>}
              {session.deadline && <span>{t('classes.deadline')}: {new Date(session.deadline).toLocaleDateString()}</span>}
            </p>
          )}
        </div>
        <div className="wb-vote-session-actions">
          <button type="button" onClick={onRefresh} title={t('classes.vote_refresh')} aria-label={`${t('classes.vote_refresh')} — ${session.title}`} className="wb-btn wb-btn--ghost wb-btn--sm">
            ↻
          </button>
          {open && (
            <button type="button" onClick={onClose} title={t('classes.vote_close_hint')} className="wb-btn wb-btn--ghost wb-btn--sm">
              {t('classes.close_vote')}
            </button>
          )}
          <ConfirmButton
            onConfirm={onDelete}
            title={t('classes.delete_vote')}
            ariaLabel={`${t('classes.delete_vote')} — ${session.title}`}
            className="wb-btn wb-btn--danger wb-btn--sm"
          >
            ✕
          </ConfirmButton>
        </div>
      </div>

      <VoteResultsBars results={results} emptyLabel={t('classes.no_votes_yet')} />
    </article>
  )
}
