import { useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { localDate } from '../lib/scheduledWorkouts'
import { checkIn, clearPendingCheckIn, savePendingCheckIn, type CheckInResult } from '../lib/attendance'

type Step = 'loading' | 'login' | CheckInResult | 'error'

/**
 * Page ouverte par le QR du coach (3.2) : /presence/<cours>?k=<code>.
 * Connecté : la présence est enregistrée tout de suite. Sinon : on garde le
 * lien, la personne se connecte, puis l'accueil la ramène ici.
 */
export default function CheckInPage() {
  const { classId } = useParams<{ classId: string }>()
  const [params] = useSearchParams()
  const location = useLocation()
  const { t, i18n } = useTranslation('common')
  const [step, setStep] = useState<Step>('loading')
  const [className, setClassName] = useState<string | null>(null)
  const code = params.get('k')
  const today = localDate()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!classId) { setStep('error'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (!session) {
        savePendingCheckIn(`${location.pathname}${location.search}`)
        setStep('login')
        return
      }
      clearPendingCheckIn()
      try {
        const result = await checkIn(classId, today, code)
        if (!mounted) return
        setStep(result)
        // Le nom du cours n'est lisible que par ses membres.
        if (result === 'ok' || result === 'already' || result === 'bad_code' || result === 'no_class') {
          const { data } = await supabase.from('classes').select('name').eq('id', classId).maybeSingle()
          if (mounted) setClassName(data?.name ?? null)
        }
      } catch {
        if (mounted) setStep('error')
      }
    })()
    return () => { mounted = false }
  }, [classId, code, today, location.pathname, location.search])

  const done = step === 'ok' || step === 'already'
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="wb-checkin-page">
      <Link to="/" className="wb-checkin-logo">WOD<span>BUD</span></Link>
      <section className="wb-checkin-card" aria-live="polite">
        {step === 'loading' && <p className="wb-checkin-status">{t('attendance.checking')}</p>}

        {step === 'login' && (
          <>
            <p className="wb-ph-tag">{t('attendance.tag')}</p>
            <h1 className="wb-checkin-title">{t('attendance.login_title')}</h1>
            <p className="wb-checkin-text">{t('attendance.login_text')}</p>
            <Link to="/login" className="wb-btn wb-btn--primary">{t('auth.login')}</Link>
            <Link to="/signup" className="wb-checkin-link">{t('attendance.signup')}</Link>
          </>
        )}

        {done && (
          <>
            <span className="wb-checkin-mark" aria-hidden="true">✓</span>
            <p className="wb-ph-tag">{t(step === 'ok' ? 'attendance.ok_tag' : 'attendance.already_tag')}</p>
            <h1 className="wb-checkin-title">{className ?? t('attendance.ok_title')}</h1>
            <p className="wb-checkin-text">{dateLabel}</p>
            <Link to="/entraineur_dashboard" className="wb-btn wb-btn--primary">{t('attendance.go_home')}</Link>
          </>
        )}

        {(step === 'not_member' || step === 'bad_code' || step === 'bad_date' || step === 'no_class' || step === 'error') && (
          <>
            <p className="wb-ph-tag">{t('attendance.tag')}</p>
            <h1 className="wb-checkin-title">{t(`attendance.err_${step}_title`)}</h1>
            {className && <p className="wb-checkin-text"><strong>{className}</strong></p>}
            <p className="wb-checkin-text">{t(`attendance.err_${step}`)}</p>
            <Link to="/entraineur_dashboard" className="wb-btn wb-btn--secondary">{t('attendance.go_home')}</Link>
          </>
        )}
      </section>
    </main>
  )
}
