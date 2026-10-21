import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import s from './landing.module.css'

type Message = { from: 'me' | 'ai'; text: string }

/**
 * Petite conversation avec l'assistant IA : la question arrive, l'IA
 * « tape » puis répond, deux échanges, puis on recommence. Ne démarre
 * qu'à l'écran ; avec « mouvement réduit », tout est affiché d'emblée.
 */
export default function AiChat({ messages, meLabel, botLabel }: { messages: Message[]; meLabel: string; botLabel: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '0px 0px -15% 0px' })
  const [shown, setShown] = useState(0)
  const [typing, setTyping] = useState(false)
  // Clé stable : le tableau venant des traductions peut changer d'identité à
  // chaque rendu, et relancer l'animation en boucle.
  const pattern = messages.map((m) => m.from).join(',')

  useEffect(() => {
    if (reduce || !inView) return
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms))

    const play = () => {
      let t = 0
      at(t, () => { setShown(0); setTyping(false) })
      pattern.split(',').forEach((from, i) => {
        if (from === 'ai') {
          t += 500
          at(t, () => setTyping(true))
          t += 1300
          at(t, () => { setTyping(false); setShown(i + 1) })
        } else {
          t += i === 0 ? 400 : 1100
          at(t, () => setShown(i + 1))
        }
      })
      // Pause sur la conversation complète, puis on rejoue.
      at(t + 4500, play)
    }
    play()
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [inView, reduce, pattern])

  const visible = reduce ? messages : messages.slice(0, shown)

  return (
    <div ref={ref} className={s.chat} aria-label={`${meLabel} / ${botLabel}`}>
      <AnimatePresence initial={false}>
        {visible.map((m, i) => (
          <motion.div
            key={`${i}-${m.text}`}
            className={m.from === 'me' ? s.bubbleMe : s.bubbleBot}
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            {m.from === 'ai' && <span className={s.bubbleWho}>{botLabel}</span>}
            {m.text}
          </motion.div>
        ))}
        {typing && (
          <motion.div
            key="typing"
            className={`${s.bubbleBot} ${s.bubbleTyping}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            aria-hidden="true"
          >
            <i /><i /><i />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
