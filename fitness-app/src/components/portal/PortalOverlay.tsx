import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { UserSegment } from '../../types'

const DEFER_KEY = 'wodbud_portal_deferred'

/**
 * Choix du portail à l'entrée dans l'app.
 *
 * Volontairement sur l'app et pas sur la page d'accueil : un sélecteur avant
 * la landing couperait le contenu indexable en deux et diluerait le
 * référencement (note SEO du plan d'août). Ici, on est déjà derrière
 * l'authentification, donc aucun impact.
 *
 * Le choix vit dans `profiles.segment` et reste modifiable dans Paramètres.
 * « Plus tard » ne fait que reporter à la prochaine visite — l'overlay ne
 * doit pas devenir un mur.
 */
export default function PortalOverlay() {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (sessionStorage.getItem(DEFER_KEY) === '1') return
      } catch { /* sessionStorage indisponible : on continue */ }

      const { data } = await supabase.auth.getUser()
      if (!mounted || !data.user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('segment')
        .eq('id', data.user.id)
        .maybeSingle()

      if (!mounted) return
      if (!profile?.segment) setVisible(true)
    })()
    return () => { mounted = false }
  }, [])

  async function choose(segment: UserSegment) {
    setSaving(true)
    try {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await supabase.from('profiles').update({ segment }).eq('id', data.user.id)
      }
      setVisible(false)
    } catch {
      // Si l'écriture échoue, on ne bloque pas l'entrée dans l'app :
      // le choix reste disponible dans Paramètres.
      setVisible(false)
    } finally {
      setSaving(false)
    }
  }

  function defer() {
    try { sessionStorage.setItem(DEFER_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('portal.title')}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem'
      }}
    >
      <div style={{ maxWidth: 720, width: '100%' }}>
        <p style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--orange)', margin: '0 0 0.5rem', textAlign: 'center' }}>
          WODBUD
        </p>
        <h2 style={{ fontFamily: 'var(--font-d)', fontSize: 'clamp(1.6rem, 5vw, 2.3rem)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.02em', margin: '0 0 0.6rem', textAlign: 'center', color: 'var(--white)' }}>
          {t('portal.title')}
        </h2>
        <p style={{ color: 'var(--muted)', textAlign: 'center', margin: '0 0 2rem', fontSize: '0.9375rem' }}>
          {t('portal.subtitle')}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.9rem' }}>
          <ChoiceCard
            icon="PERSO"
            title={t('portal.individu_title')}
            description={t('portal.individu_desc')}
            disabled={saving}
            onClick={() => { void choose('individu') }}
          />
          <ChoiceCard
            icon="GYM"
            title={t('portal.gym_title')}
            description={t('portal.gym_desc')}
            disabled={saving}
            onClick={() => { void choose('gym') }}
          />
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={defer}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '0.4rem' }}
          >
            {t('portal.later')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ChoiceCard({ icon, title, description, onClick, disabled }: {
  icon: string
  title: string
  description: string
  onClick: () => void
  disabled?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        textAlign: 'left', cursor: disabled ? 'wait' : 'pointer',
        border: `1px solid ${hovered ? 'var(--orange)' : 'var(--border)'}`,
        background: hovered ? 'rgba(255,77,0,0.07)' : 'var(--dark)',
        padding: '1.5rem 1.4rem', color: 'var(--white)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s'
      }}
    >
      <span style={{ fontFamily: 'var(--font-d)', fontSize: '0.6875rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--orange)' }}>
        {icon}
      </span>
      <span style={{ fontFamily: 'var(--font-d)', fontSize: '1.25rem', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {title}
      </span>
      <span style={{ color: 'var(--muted)', fontSize: '0.8125rem', lineHeight: 1.5 }}>
        {description}
      </span>
    </button>
  )
}
