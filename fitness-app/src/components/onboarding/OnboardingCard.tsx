import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { fetchOnboarding, hide, isHidden, STEPS, type OnboardingArea, type OnboardingState, type StepKey } from '../../lib/onboarding'

const TARGETS: Record<OnboardingArea, Partial<Record<StepKey, string>>> = {
  coach: { wod: '/dashboard/workout', class: '/dashboard/classes', session: '/dashboard/session', photo: '/dashboard/settings' },
  athlete: { session: '/athlete/session', community: '/athlete/communities', photo: '/athlete/settings' }
}

/**
 * Carte « Premiers pas » en haut de l'accueil : 4 étapes qui se cochent
 * toutes seules. Elle disparaît quand tout est fait, ou quand on la masque.
 */
export default function OnboardingCard({ area }: { area: OnboardingArea }) {
  const { t } = useTranslation('common')
  const [state, setState] = useState<OnboardingState | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let mounted = true
    fetchOnboarding()
      .then((s) => { if (mounted && s) { setState(s); setHidden(isHidden(s.userId)) } })
      .catch(() => { /* la carte est un bonus : en cas d'erreur, on ne l'affiche pas */ })
    return () => { mounted = false }
  }, [])

  if (!state || hidden) return null
  const steps = STEPS[area]
  const doneCount = steps.filter((k) => state.done[k]).length
  if (doneCount === steps.length) return null
  const next = steps.find((k) => !state.done[k])

  return (
    <section className="wb-onb" aria-labelledby="wb-onb-title">
      <div className="wb-onb-head">
        <div>
          <p className="wb-onb-tag">{t('onboarding.tag')}</p>
          <h2 id="wb-onb-title">{t(`onboarding.title_${area}`)}</h2>
        </div>
        <button
          type="button"
          className="wb-onb-hide"
          onClick={() => { hide(state.userId); setHidden(true) }}
          aria-label={t('onboarding.hide')}
        >
          ✕
        </button>
      </div>

      <div className="wb-onb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label={t('onboarding.progress', { done: doneCount, total: steps.length })}>
        <span style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <p className="wb-onb-count">{t('onboarding.progress', { done: doneCount, total: steps.length })}</p>

      <ol className="wb-onb-steps">
        {steps.map((k, i) => {
          const done = state.done[k]
          const target = TARGETS[area][k]
          const body = (
            <>
              <span className={`wb-onb-dot${done ? ' is-done' : ''}`} aria-hidden="true">{done ? '✓' : i + 1}</span>
              <span className="wb-onb-text">
                <strong>{t(`onboarding.${k}_title`)}</strong>
                {!done && <small>{t(`onboarding.${k}_desc`)}</small>}
              </span>
              {!done && target && <span className="wb-onb-chev" aria-hidden="true">›</span>}
            </>
          )
          const cls = `wb-onb-step${done ? ' is-done' : ''}${k === next ? ' is-next' : ''}`
          return (
            <li key={k}>
              {!done && target ? (
                <Link to={target} className={cls}>{body}</Link>
              ) : (
                <div className={cls}>
                  {body}
                  <span className="sr-only">{done ? t('onboarding.done') : ''}</span>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
