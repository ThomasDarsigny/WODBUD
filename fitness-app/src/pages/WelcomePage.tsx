import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { usePageMeta } from '../hooks/usePageMeta'
import { getLocalUser } from '../lib/currentUser'
import { supabase } from '../lib/supabase'
import { homeFor, inviteTokenFrom, saveMyRole, type OnboardingAnswers, type ProfileRole } from '../lib/profileRole'

type Step = 'role' | 'details'

const VENUES = ['box', 'gym', 'independent', 'online'] as const
const SIZES = ['1-10', '11-30', '31-100', '100+'] as const
const GOALS = ['strength', 'endurance', 'weight', 'competition', 'health'] as const

/**
 * Bienvenue : juste après la création du compte (et la validation du
 * courriel), deux questions pour savoir si l'on parle à un coach ou à un
 * athlète — et l'envoyer directement au bon endroit.
 */
export default function WelcomePage() {
  const { t } = useTranslation('common')
  usePageMeta(`${t('welcome.title_role')} | WODBUD`)
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const [firstName, setFirstName] = useState('')
  const [step, setStep] = useState<Step>('role')
  const [role, setRole] = useState<ProfileRole | null>(null)
  const [answers, setAnswers] = useState<OnboardingAnswers>({})
  const [invite, setInvite] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    getLocalUser().then(async ({ data }) => {
      const user = data.user
      if (!user || !mounted) return
      const { data: p } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
      const name = (p?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? '').trim().split(/\s+/)[0]
      if (mounted) setFirstName(name ?? '')
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  const choose = (r: ProfileRole) => { setRole(r); setAnswers({}); setStep('details') }
  const pick = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: a[k] === v ? undefined : v }))

  const token = role === 'athlete' && answers.hasCoach ? inviteTokenFrom(invite) : null
  const inviteInvalid = role === 'athlete' && answers.hasCoach === true && invite.trim().length > 0 && !token

  async function finish() {
    if (!role) return
    setSaving(true)
    setError(null)
    try {
      await saveMyRole(role, answers)
      // Un athlète arrivé avec son lien rejoint le cours tout de suite.
      navigate(token ? `/join/${token}` : homeFor(role), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.generic'))
      setSaving(false)
    }
  }

  const slide = reduce
    ? {}
    : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } }

  return (
    <main className="wb-welcome">
      <div className="wb-welcome-inner">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>

        <ol className="wb-welcome-steps" aria-label={t('welcome.progress', { step: step === 'role' ? 1 : 2, total: 2 })}>
          <li className="is-on" />
          <li className={step === 'details' ? 'is-on' : undefined} />
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          {step === 'role' ? (
            <motion.section key="role" className="wb-welcome-card" {...slide}>
              <p className="wb-ph-tag">{firstName ? t('welcome.hello', { name: firstName }) : t('welcome.hello_anon')}</p>
              <h1>{t('welcome.title_role')}</h1>
              <p className="wb-welcome-sub">{t('welcome.sub_role')}</p>

              <div className="wb-welcome-roles">
                <button type="button" className="wb-role-card" onClick={() => choose('coach')}>
                  <img src="/badges/sifflet.svg" alt="" width={72} height={72} />
                  <span>
                    <strong>{t('welcome.coach')}</strong>
                    <small>{t('welcome.coach_desc')}</small>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </button>
                <button type="button" className="wb-role-card" onClick={() => choose('athlete')}>
                  <img src="/badges/premiere-serie.svg" alt="" width={72} height={72} />
                  <span>
                    <strong>{t('welcome.athlete')}</strong>
                    <small>{t('welcome.athlete_desc')}</small>
                  </span>
                  <span className="wb-row-chev" aria-hidden="true">›</span>
                </button>
              </div>
              <p className="wb-welcome-note">{t('welcome.change_later')}</p>
            </motion.section>
          ) : (
            <motion.section key="details" className="wb-welcome-card" {...slide}>
              <button type="button" className="wb-rec-back" onClick={() => setStep('role')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                ‹ {t('actions.back')}
              </button>

              {role === 'coach' ? (
                <>
                  <h1>{t('welcome.title_coach')}</h1>
                  <p className="wb-welcome-sub">{t('welcome.sub_coach')}</p>
                  <fieldset className="wb-welcome-q">
                    <legend>{t('welcome.q_venue')}</legend>
                    <div className="wb-welcome-chips">
                      {VENUES.map((v) => (
                        <button key={v} type="button" className="wb-chip" aria-pressed={answers.venue === v} onClick={() => pick('venue', v)}>{t(`welcome.venue_${v}`)}</button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="wb-welcome-q">
                    <legend>{t('welcome.q_size')}</legend>
                    <div className="wb-welcome-chips">
                      {SIZES.map((v) => (
                        <button key={v} type="button" className="wb-chip" aria-pressed={answers.groupSize === v} onClick={() => pick('groupSize', v)}>{t('welcome.size', { range: v })}</button>
                      ))}
                    </div>
                  </fieldset>
                </>
              ) : (
                <>
                  <h1>{t('welcome.title_athlete')}</h1>
                  <p className="wb-welcome-sub">{t('welcome.sub_athlete')}</p>
                  <fieldset className="wb-welcome-q">
                    <legend>{t('welcome.q_coach')}</legend>
                    <div className="wb-welcome-chips">
                      <button type="button" className="wb-chip" aria-pressed={answers.hasCoach === true} onClick={() => pick('hasCoach', true)}>{t('welcome.has_coach_yes')}</button>
                      <button type="button" className="wb-chip" aria-pressed={answers.hasCoach === false} onClick={() => pick('hasCoach', false)}>{t('welcome.has_coach_no')}</button>
                    </div>
                    {answers.hasCoach && (
                      <label className="wb-welcome-invite">
                        <span>{t('welcome.invite_label')}</span>
                        <input
                          className="wb-input"
                          value={invite}
                          onChange={(e) => setInvite(e.target.value)}
                          placeholder={t('welcome.invite_placeholder')}
                          autoComplete="off"
                          aria-invalid={inviteInvalid}
                        />
                        <small>{inviteInvalid ? t('welcome.invite_invalid') : t('welcome.invite_hint')}</small>
                      </label>
                    )}
                  </fieldset>
                  <fieldset className="wb-welcome-q">
                    <legend>{t('welcome.q_goal')}</legend>
                    <div className="wb-welcome-chips">
                      {GOALS.map((v) => (
                        <button key={v} type="button" className="wb-chip" aria-pressed={answers.goal === v} onClick={() => pick('goal', v)}>{t(`welcome.goal_${v}`)}</button>
                      ))}
                    </div>
                  </fieldset>
                </>
              )}

              {error && <p className="wb-rec-error" role="alert">{error}</p>}

              <button type="button" className="wb-btn wb-btn--primary wb-btn--lg wb-btn--block" onClick={() => { void finish() }} disabled={saving || inviteInvalid}>
                {saving ? t('status.loading') : token ? t('welcome.cta_join') : t('welcome.cta')}
              </button>
              <p className="wb-welcome-note">{t('welcome.optional')}</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
