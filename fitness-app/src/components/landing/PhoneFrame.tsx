import s from './landing.module.css'

/** Nombre de couches qui donnent son épaisseur au téléphone (vue en 3D). */
const EDGE_LAYERS = 10

/**
 * Téléphone réaliste, tout en CSS (aucune image de maquette) : tranche en
 * titane biseautée, lignes d'antenne, boutons en relief, Dynamic Island avec
 * lentille, barre d'état, vignettage et reflet du verre. Des couches empilées
 * en profondeur lui donnent une vraie épaisseur quand il pivote.
 *
 * `slides` + `active` : plusieurs écrans empilés, celui actif en fondu
 * (récit au défilement). Sinon `src` affiche une seule capture.
 * Le reflet suit la variable CSS --glare (posée par le parent qui le fait tourner).
 */
export default function PhoneFrame({ src, alt, slides, active = 0 }: {
  src?: string
  alt?: string
  slides?: Array<{ src: string; alt: string }>
  active?: number
}) {
  const screens = slides ?? (src ? [{ src, alt: alt ?? '' }] : [])
  return (
    <div className={s.phone3d}>
      {Array.from({ length: EDGE_LAYERS }, (_, i) => (
        <span key={i} className={s.phoneEdge} style={{ transform: `translateZ(${-(i + 1) * 1.1}px)` }} aria-hidden="true" />
      ))}
      <span className={s.phoneBack} style={{ transform: `translateZ(${-(EDGE_LAYERS + 1) * 1.1}px)` }} aria-hidden="true" />

      <div className={s.device}>
        <span className={s.antenna} aria-hidden="true" />
        <span className={`${s.devBtn} ${s.devAction}`} aria-hidden="true" />
        <span className={`${s.devBtn} ${s.devVolUp}`} aria-hidden="true" />
        <span className={`${s.devBtn} ${s.devVolDown}`} aria-hidden="true" />
        <span className={`${s.devBtn} ${s.devPower}`} aria-hidden="true" />

        <div className={s.bezel}>
          <div className={s.screen}>
            <div className={s.statusBar} aria-hidden="true">
              <span className={s.statusTime}>9:41</span>
              <span className={s.island}><i className={s.lens} /></span>
              <span className={s.statusIcons}>
                <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="0.8" /><rect x="5" y="5.5" width="3" height="6.5" rx="0.8" /><rect x="10" y="3" width="3" height="9" rx="0.8" /><rect x="15" y="0" width="3" height="12" rx="0.8" /></svg>
                <svg viewBox="0 0 16 12"><path d="M8 2.6c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.6 10.6 0 0 0 8 .8 10.6 10.6 0 0 0 .5 3.8l1.2 1.3A8.8 8.8 0 0 1 8 2.6Zm0 3.5c1.4 0 2.7.5 3.7 1.4l1.2-1.3A7.1 7.1 0 0 0 8 4.3a7.1 7.1 0 0 0-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.5c.5 0 1 .2 1.3.5L8 11.5 6.7 10.1c.3-.3.8-.5 1.3-.5Z" /></svg>
                <svg viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.2" fill="none" stroke="currentColor" opacity="0.4" /><rect x="2" y="2" width="20" height="8" rx="2" /><path d="M25 4v4c.8-.3 1.3-1.1 1.3-2S25.8 4.3 25 4Z" opacity="0.4" /></svg>
              </span>
            </div>
            <div className={s.screenStack}>
              {screens.map((sc, i) => (
                <img
                  key={sc.src}
                  src={sc.src}
                  alt={i === active ? sc.alt : ''}
                  aria-hidden={i === active ? undefined : true}
                  width={390}
                  height={844}
                  loading="lazy"
                  decoding="async"
                  className={`${s.screenImg} ${i === active ? s.screenImgOn : ''}`}
                />
              ))}
            </div>
            <span className={s.homeBar} aria-hidden="true" />
            <span className={s.vignette} aria-hidden="true" />
            <span className={s.glare} aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  )
}
