import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageMeta } from '../hooks/usePageMeta'
import { useAppEntry } from '../lib/useAppEntry'
import { readProfileHint } from '../lib/landingProfile'
import { CONTACT_TOPICS, sendContactMessage, type ContactTopic } from '../lib/contact'
import s from '../components/landing/landing.module.css'

const LANGS = ['fr', 'en', 'es'] as const

type Status = 'idle' | 'sending' | 'sent' | 'invalid' | 'rate_limited' | 'network'

/**
 * Contact (/contact) : un visiteur, avec ou sans compte, écrit à l'équipe
 * WODBUD. Le message arrive dans l'administration (« Messages du site ») ;
 * la réponse part par courriel. Un champ piège, invisible, écarte les robots
 * qui remplissent tout.
 */
export default function ContactPage() {
  const { t, i18n } = useTranslation('common')
  usePageMeta(t('contact.meta_title'), t('contact.meta_description'))
  const appEntry = useAppEntry()
  const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(0, 2)
  const hint = readProfileHint()
  const [topic, setTopic] = useState<ContactTopic>(hint === 'center' ? 'center' : hint === 'member' ? 'member' : 'question')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [message, setMessage] = useState('')
  const [trap, setTrap] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (status === 'sending') return
    // Le champ piège est rempli : un robot. On fait comme si tout allait bien.
    if (trap) { setStatus('sent'); return }
    setStatus('sending')
    try {
      const result = await sendContactMessage({
        name: name.trim(),
        email: email.trim(),
        topic,
        message: message.trim(),
        organization: topic === 'center' ? organization.trim() : undefined,
        locale: currentLang
      })
      setStatus(result === 'ok' ? 'sent' : result)
    } catch {
      setStatus('network')
    }
  }

  const error = status === 'invalid' ? t('contact.err_invalid') : status === 'rate_limited' ? t('contact.err_rate') : status === 'network' ? t('contact.err_network') : null

  return (
    <div className={`${s.root} ${s.chooser}`}>
      <nav className={`${s.nav} ${s.navScrolled}`}>
        <Link to="/" className={s.logo}>WOD<span>BUD</span></Link>
        <div className={s.navRight}>
          <div className={s.langSwitch} role="group" aria-label={t('landing.lang_label')}>
            {LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={currentLang === l}
                className={`${s.langBtn} ${currentLang === l ? s.langBtnOn : ''}`}
                onClick={() => { void i18n.changeLanguage(l) }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to={appEntry} viewTransition className={s.btnNav}>
            <span className={s.labelShort}>{t('landing.nav.login')}</span>
            <span className={s.labelLong}>{t('landing.nav.access_dashboard')}</span>
          </Link>
        </div>
      </nav>

      <main className={s.contactMain}>
        <header className={s.contactIntro}>
          <p className={s.sectionTag}>{t('contact.tag')}</p>
          <h1 className={s.chooserTitle}>{t('contact.title')}</h1>
          <p className={s.chooserSub}>{t('contact.lead')}</p>
          <ul className={s.contactPoints}>
            <li>{t('contact.point_center')}</li>
            <li>{t('contact.point_member')}</li>
            <li>{t('contact.point_reply')}</li>
          </ul>
        </header>

        <section className={s.contactCard} aria-labelledby="contact-form-title">
          {status === 'sent' ? (
            <div className={s.contactDone} role="status">
              <span className={s.contactDoneMark} aria-hidden="true">✓</span>
              <h2 id="contact-form-title">{t('contact.success_title')}</h2>
              <p>{t('contact.success_body', { email: email.trim() })}</p>
              <Link to="/" className={s.btnPrimary}>{t('contact.back_home')}</Link>
            </div>
          ) : (
            <form className={s.contactForm} onSubmit={(e) => { void submit(e) }} noValidate={false}>
              <h2 id="contact-form-title" className={s.contactFormTitle}>{t('contact.form_title')}</h2>

              <div className={s.contactRow}>
                <div className={s.contactField}>
                  <label htmlFor="contact-name">{t('contact.name')}</label>
                  <input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="name" />
                </div>
                <div className={s.contactField}>
                  <label htmlFor="contact-email">{t('contact.email')}</label>
                  <input id="contact-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="email" inputMode="email" />
                </div>
              </div>

              <fieldset className={s.contactTopics}>
                <legend>{t('contact.topic')}</legend>
                <div>
                  {CONTACT_TOPICS.map((k) => (
                    <label key={k} className={topic === k ? s.contactTopicOn : undefined}>
                      <input type="radio" name="contact-topic" value={k} checked={topic === k} onChange={() => setTopic(k)} />
                      {t(`contact.topics.${k}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {topic === 'center' && (
                <div className={s.contactField}>
                  <label htmlFor="contact-org">{t('contact.organization')}</label>
                  <input id="contact-org" value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={120} autoComplete="organization" placeholder={t('contact.organization_placeholder')} />
                </div>
              )}

              <div className={s.contactField}>
                <label htmlFor="contact-message">{t('contact.message')}</label>
                <textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={6} aria-describedby="contact-message-hint" />
                <small id="contact-message-hint">{t('contact.message_hint')}</small>
              </div>

              {/* Champ piège : hors écran et hors du parcours au clavier ; un humain ne le voit pas. */}
              <div className={s.contactTrap} aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input id="contact-website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </div>

              {error && <p className={s.contactError} role="alert">{error}</p>}

              <button type="submit" className={s.btnPrimary} disabled={status === 'sending'}>
                {status === 'sending' ? t('contact.sending') : t('contact.send')}
              </button>
              <p className={s.contactNote}>
                {t('contact.privacy_note')} <Link to="/confidentialite">{t('contact.privacy_link')}</Link>
              </p>
            </form>
          )}
        </section>
      </main>

      <footer className={s.footer}>
        <p className={s.footerCopy}>{t('landing.footer.copy')}</p>
        <nav className={s.footerLinks} aria-label={t('landing.footer.links_label')}>
          <Link to="/confidentialite">{t('landing.footer.privacy')}</Link>
          <Link to="/contact" aria-current="page">{t('landing.footer.contact')}</Link>
        </nav>
      </footer>
    </div>
  )
}
