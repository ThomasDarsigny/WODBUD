import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { usePageMeta } from '../hooks/usePageMeta'
import { getLocalUser } from '../lib/currentUser'
import { supabase } from '../lib/supabase'
import { homeFor, inviteTokenFrom, rememberRole, saveMyRole, type OnboardingAnswers, type ProfileRole } from '../lib/profileRole'
import { readProfileHint } from '../lib/landingProfile'
import { acceptInvite, centerTokenFrom, createCenter, isStaff, previewInvite, readPendingInvite } from '../lib/center'
import { BOX_PRESET, HOME_PRESET, type EquipmentId } from '../lib/equipment'
import EquipmentPicker from '../components/center/EquipmentPicker'

type Step = 'role' | 'details' | 'equipment'

const VENUES = ['box', 'gym', 'independent', 'online'] as const
const SIZES = ['1-10', '11-30', '31-100', '100+'] as const
const GOALS = ['strength', 'endurance', 'weight', 'competition', 'health'] as const

const ROLES: { id: ProfileRole; art: string }[] = [
  { id: 'center', art: 'sifflet' },
  { id: 'member', art: 'membre' },
  { id: 'perso', art: 'premiere-serie' }
]

/**
 * Bienvenue : juste après la création du compte (et la validation du
 * courriel), le profil — centre, membre d'un centre ou perso —, quelques
 * questions facultatives et l'équipement, puis le bon espace.
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
  const [centerName, setCenterName] = useState('')
  const [invite, setInvite] = useState('')
  const [invitePreview, setInvitePreview] = useState<{ name: string; valid: boolean } | null>(null)
  const [equipment, setEquipment] = useState<EquipmentId[]>([])
  const [saving, setSaving] = useState(false)
  const [hint] = useState(readProfileHint)
  const roles = hint ? [...ROLES].sort((a, b) => Number(b.id === hint) - Number(a.id === hint)) : ROLES
  const [error, setError] = useState<string | null>(null)

  // Arrivé par un lien d'invitation avant d'avoir un compte : on y retourne,
  // la page du lien fixe le profil.
  useEffect(() => {
    const pending = readPendingInvite()
    if (pending) navigate(`/rejoindre/${pending}`, { replace: true })
  }, [navigate])

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

  const classToken = role === 'member' ? inviteTokenFrom(invite) : null
  const centerToken = role === 'member' && !classToken ? centerTokenFrom(invite) : null
  const inviteInvalid = role === 'member' && invite.trim().length > 0 && !classToken && (!centerToken || invitePreview?.valid === false)

  // Aperçu du centre dès qu'un code plausible est collé.
  useEffect(() => {
    if (!centerToken) return
    let alive = true
    const id = setTimeout(() => {
      previewInvite(centerToken)
        .then((p) => { if (alive) setInvitePreview(p ? { name: p.centerName, valid: p.valid } : { name: '', valid: false }) })
        .catch(() => { if (alive) setInvitePreview(null) })
    }, 350)
    return () => { alive = false; clearTimeout(id) }
  }, [centerToken])

  // Un membre qui rejoint un centre en hérite l'équipement : pas de question.
  const needsEquipment = role === 'center' || role === 'perso' || (role === 'member' && !centerToken)
  const steps: Step[] = needsEquipment ? ['role', 'details', 'equipment'] : ['role', 'details']
  const stepIndex = steps.indexOf(step)

  const choose = (r: ProfileRole) => {
    setRole(r)
    setAnswers({})
    setError(null)
    setEquipment(r === 'center' ? [...BOX_PRESET] : r === 'perso' ? [...HOME_PRESET] : [])
    setStep('details')
  }
  const pick = <K extends keyof OnboardingAnswers>(k: K, v: OnboardingAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: a[k] === v ? undefined : v }))

  const detailsBlocked = role === 'center' ? centerName.trim().length < 2 : inviteInvalid
  const next = () => (needsEquipment ? setStep('equipment') : void finish())

  async function finish() {
    if (!role) return
    setSaving(true)
    setError(null)
    try {
      const { data } = await getLocalUser()
      const userId = data.user?.id
      if (role === 'center') {
        await createCenter({ name: centerName, equipment, venue: answers.venue, groupSize: answers.groupSize })
        await saveMyRole('center', answers)
        navigate(homeFor('center'), { replace: true })
        return
      }
      if (centerToken) {
        const joined = await acceptInvite(centerToken)
        await saveMyRole(isStaff(joined.role) ? 'center' : 'member', answers)
        if (userId) rememberRole(userId, isStaff(joined.role) ? 'center' : 'member')
        navigate(isStaff(joined.role) ? homeFor('center') : homeFor('member'), { replace: true })
        return
      }
      await saveMyRole(role, answers, equipment)
      // Un lien de cours : on rejoint le cours tout de suite.
      navigate(classToken ? `/join/${classToken}` : homeFor(role), { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      setError(msg.includes('invalid_invite') ? t('welcome.invite_invalid') : msg || t('errors.generic'))
      setSaving(false)
    }
  }

  const slide = reduce
    ? {}
    : { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 }, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const } }

  const back = (
    <button type="button" className="wb-rec-back wb-unbutton" onClick={() => setStep(step === 'equipment' ? 'details' : 'role')}>
      ‹ {t('actions.back')}
    </button>
  )

  return (
    <main className="wb-welcome">
      <div className="wb-welcome-inner">
        <div className="wb-auth-logo" aria-hidden="true">WOD<span>BUD</span></div>

        <ol className="wb-welcome-steps" aria-label={t('welcome.progress', { step: stepIndex + 1, total: steps.length })}>
          {steps.map((s, i) => <li key={s} className={i <= stepIndex ? 'is-on' : undefined} />)}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          {step === 'role' && (
            <motion.section key="role" className="wb-welcome-card" {...slide}>
              <p className="wb-ph-tag">{firstName ? t('welcome.hello', { name: firstName }) : t('welcome.hello_anon')}</p>
              <h1>{t('welcome.title_role')}</h1>
              <p className="wb-welcome-sub">{t('welcome.sub_role')}</p>

              <div className="wb-welcome-roles">
                {roles.map(({ id, art }) => (
                  <button key={id} type="button" className={`wb-role-card${id === hint ? ' is-suggested' : ''}`} onClick={() => choose(id)}>
                    <img src={`/badges/${art}.svg`} alt="" width={72} height={72} />
                    <span>
                      <strong>{t(`welcome.role_${id}`)}</strong>
                      <small>{t(`welcome.role_${id}_desc`)}</small>
                    </span>
                    <span className="wb-row-chev" aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
              <p className="wb-welcome-note">{t('welcome.staff_note')}</p>
            </motion.section>
          )}

          {step === 'details' && (
            <motion.section key="details" className="wb-welcome-card" {...slide}>
              {back}

              {role === 'center' && (
                <>
                  <h1>{t('welcome.title_center')}</h1>
                  <p className="wb-welcome-sub">{t('welcome.sub_center')}</p>
                  <label className="wb-welcome-invite">
                    <span>{t('welcome.center_name')}</span>
                    <input
                      className="wb-input"
                      value={centerName}
                      onChange={(e) => setCenterName(e.target.value)}
                      placeholder={t('welcome.center_name_placeholder')}
                      maxLength={80}
                      autoComplete="organization"
                    />
                  </label>
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
              )}

              {role === 'member' && (
                <>
                  <h1>{t('welcome.title_member')}</h1>
                  <p className="wb-welcome-sub">{t('welcome.sub_member')}</p>
                  <label className="wb-welcome-invite">
                    <span>{t('welcome.invite_label')}</span>
                    <input
                      className="wb-input"
                      value={invite}
                      onChange={(e) => { setInvite(e.target.value); setInvitePreview(null) }}
                      placeholder={t('welcome.invite_placeholder')}
                      autoComplete="off"
                      aria-invalid={inviteInvalid}
                    />
                    <small>
                      {inviteInvalid
                        ? t('welcome.invite_invalid')
                        : invitePreview?.valid
                          ? t('welcome.invite_found', { name: invitePreview.name })
                          : t('welcome.invite_hint')}
                    </small>
                  </label>
                </>
              )}

              {role === 'perso' && (
                <>
                  <h1>{t('welcome.title_perso')}</h1>
                  <p className="wb-welcome-sub">{t('welcome.sub_perso')}</p>
                </>
              )}

              {role !== 'center' && (
                <fieldset className="wb-welcome-q">
                  <legend>{t('welcome.q_goal')}</legend>
                  <div className="wb-welcome-chips">
                    {GOALS.map((v) => (
                      <button key={v} type="button" className="wb-chip" aria-pressed={answers.goal === v} onClick={() => pick('goal', v)}>{t(`welcome.goal_${v}`)}</button>
                    ))}
                  </div>
                </fieldset>
              )}

              {error && <p className="wb-rec-error" role="alert">{error}</p>}

              <button type="button" className="wb-btn wb-btn--primary wb-btn--lg wb-btn--block" onClick={next} disabled={saving || detailsBlocked}>
                {saving ? t('status.loading') : needsEquipment ? t('actions.next') : centerToken ? t('welcome.cta_join_center') : t('welcome.cta')}
              </button>
              <p className="wb-welcome-note">{role === 'center' ? t('welcome.center_name_note') : t('welcome.optional')}</p>
            </motion.section>
          )}

          {step === 'equipment' && (
            <motion.section key="equipment" className="wb-welcome-card" {...slide}>
              {back}
              <h1>{role === 'center' ? t('welcome.title_equipment_center') : t('welcome.title_equipment_home')}</h1>
              <p className="wb-welcome-sub">{t('welcome.sub_equipment')}</p>
              <EquipmentPicker
                value={equipment}
                onChange={setEquipment}
                preset={role === 'center' ? BOX_PRESET : HOME_PRESET}
                presetLabel={role === 'center' ? t('equipment.preset_box') : t('equipment.preset_home')}
              />

              {error && <p className="wb-rec-error" role="alert">{error}</p>}

              <button type="button" className="wb-btn wb-btn--primary wb-btn--lg wb-btn--block" onClick={() => { void finish() }} disabled={saving}>
                {saving ? t('status.loading') : role === 'center' ? t('welcome.cta_center') : classToken ? t('welcome.cta_join') : t('welcome.cta')}
              </button>
              <p className="wb-welcome-note">{t('welcome.equipment_later')}</p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
