import type { MuscleGroup } from '../../types'

export type MannequinView = 'front' | 'back'

export interface MuscleShape {
  /** Groupe musculaire de la table muscle_groups. */
  muscle: MuscleGroup
  /** Tracé SVG dans le viewBox 0 0 200 400. */
  d: string
  /** Côté, pour les muscles bilatéraux. Sert seulement au rendu. */
  side?: 'l' | 'r'
}

/**
 * Parties non musculaires : tête, cou, mains, bassin, genoux, pieds.
 * Elles ne portent jamais de couleur de charge — sinon le mannequin
 * raconterait n'importe quoi sur des zones qui ne travaillent pas.
 */
export const NEUTRAL_SHAPES: Record<MannequinView, string[]> = {
  front: [
    'M100,9 C110,9 119,18 119,29 C119,41 110,50 100,50 C90,50 81,41 81,29 C81,18 90,9 100,9 Z',
    'M91,48 L109,48 L109,60 C104,63 96,63 91,60 Z',
    'M43,184 C40,191 41,200 45,203 L57,203 C60,198 59,190 57,184 Z',
    'M157,184 C160,191 159,200 155,203 L143,203 C140,198 141,190 143,184 Z',
    'M85,155 L115,155 L117,180 C110,188 90,188 83,180 Z',
    'M76,258 L98,258 L97,278 L78,278 Z',
    'M124,258 L102,258 L103,278 L122,278 Z',
    'M81,330 L96,330 L99,352 L77,352 Z',
    'M119,330 L104,330 L101,352 L123,352 Z'
  ],
  back: [
    'M100,9 C110,9 119,18 119,29 C119,41 110,50 100,50 C90,50 81,41 81,29 C81,18 90,9 100,9 Z',
    'M91,48 L109,48 L109,58 C104,61 96,61 91,58 Z',
    'M43,184 C40,191 41,200 45,203 L57,203 C60,198 59,190 57,184 Z',
    'M157,184 C160,191 159,200 155,203 L143,203 C140,198 141,190 143,184 Z',
    'M76,258 L98,258 L97,278 L78,278 Z',
    'M124,258 L102,258 L103,278 L122,278 Z',
    'M81,330 L96,330 L99,352 L77,352 Z',
    'M119,330 L104,330 L101,352 L123,352 Z'
  ]
}

export const MUSCLE_SHAPES: Record<MannequinView, MuscleShape[]> = {
  front: [
    { muscle: 'shoulders', side: 'l', d: 'M79,57 C67,59 57,68 55,82 C54,88 55,94 57,98 L71,94 C72,81 75,69 81,61 Z' },
    { muscle: 'shoulders', side: 'r', d: 'M121,57 C133,59 143,68 145,82 C146,88 145,94 143,98 L129,94 C128,81 125,69 119,61 Z' },
    { muscle: 'chest', side: 'l', d: 'M83,59 C90,56 96,56 99,59 L99,101 C87,104 78,98 76,89 C74,77 77,65 83,59 Z' },
    { muscle: 'chest', side: 'r', d: 'M117,59 C110,56 104,56 101,59 L101,101 C113,104 122,98 124,89 C126,77 123,65 117,59 Z' },
    { muscle: 'core', d: 'M88,103 L112,103 L111,140 C111,151 106,157 100,157 C94,157 89,151 89,140 Z' },
    { muscle: 'obliques', side: 'l', d: 'M77,97 C83,101 86,105 87,111 L87,148 C81,142 79,131 79,118 Z' },
    { muscle: 'obliques', side: 'r', d: 'M123,97 C117,101 114,105 113,111 L113,148 C119,142 121,131 121,118 Z' },
    { muscle: 'biceps', side: 'l', d: 'M57,95 C51,107 48,121 49,137 L65,139 C65,121 67,107 71,95 Z' },
    { muscle: 'biceps', side: 'r', d: 'M143,95 C149,107 152,121 151,137 L135,139 C135,121 133,107 129,95 Z' },
    { muscle: 'forearms', side: 'l', d: 'M49,135 C46,151 44,169 44,185 L58,185 C59,168 61,151 64,137 Z' },
    { muscle: 'forearms', side: 'r', d: 'M151,135 C154,151 156,169 156,185 L142,185 C141,168 139,151 136,137 Z' },
    { muscle: 'quads', side: 'l', d: 'M83,182 C77,198 75,222 77,256 L96,258 C97,226 97,202 97,185 C92,187 87,186 83,182 Z' },
    { muscle: 'quads', side: 'r', d: 'M117,182 C123,198 125,222 123,256 L104,258 C103,226 103,202 103,185 C108,187 113,186 117,182 Z' },
    { muscle: 'calves', side: 'l', d: 'M80,276 C77,292 78,312 82,330 L95,330 C97,312 97,292 96,276 Z' },
    { muscle: 'calves', side: 'r', d: 'M120,276 C123,292 122,312 118,330 L105,330 C103,312 103,292 104,276 Z' }
  ],
  back: [
    { muscle: 'shoulders', side: 'l', d: 'M79,57 C67,59 57,68 55,82 C54,88 55,94 57,98 L71,94 C72,81 75,69 81,61 Z' },
    { muscle: 'shoulders', side: 'r', d: 'M121,57 C133,59 143,68 145,82 C146,88 145,94 143,98 L129,94 C128,81 125,69 119,61 Z' },
    { muscle: 'back', d: 'M88,54 C96,52 104,52 112,54 L126,68 C117,76 109,79 100,79 C91,79 83,76 74,68 Z' },
    { muscle: 'back', side: 'l', d: 'M75,70 C84,78 92,81 99,81 L99,140 C88,138 80,128 76,112 C73,98 73,80 75,70 Z' },
    { muscle: 'back', side: 'r', d: 'M125,70 C116,78 108,81 101,81 L101,140 C112,138 120,128 124,112 C127,98 127,80 125,70 Z' },
    { muscle: 'triceps', side: 'l', d: 'M57,95 C51,107 48,121 49,137 L65,139 C65,121 67,107 71,95 Z' },
    { muscle: 'triceps', side: 'r', d: 'M143,95 C149,107 152,121 151,137 L135,139 C135,121 133,107 129,95 Z' },
    { muscle: 'forearms', side: 'l', d: 'M49,135 C46,151 44,169 44,185 L58,185 C59,168 61,151 64,137 Z' },
    { muscle: 'forearms', side: 'r', d: 'M151,135 C154,151 156,169 156,185 L142,185 C141,168 139,151 136,137 Z' },
    { muscle: 'lower_back', d: 'M88,136 L112,136 L114,158 C108,164 92,164 86,158 Z' },
    { muscle: 'glutes', side: 'l', d: 'M84,162 C77,168 74,182 78,192 C83,200 92,202 98,197 L98,165 C93,167 88,166 84,162 Z' },
    { muscle: 'glutes', side: 'r', d: 'M116,162 C123,168 126,182 122,192 C117,200 108,202 102,197 L102,165 C107,167 112,166 116,162 Z' },
    { muscle: 'hamstrings', side: 'l', d: 'M79,194 C76,214 76,238 78,256 L96,258 C97,232 97,211 97,196 C92,200 84,199 79,194 Z' },
    { muscle: 'hamstrings', side: 'r', d: 'M121,194 C124,214 124,238 122,256 L104,258 C103,232 103,211 103,196 C108,200 116,199 121,194 Z' },
    { muscle: 'calves', side: 'l', d: 'M80,276 C77,292 78,312 82,330 L95,330 C97,312 97,292 96,276 Z' },
    { muscle: 'calves', side: 'r', d: 'M120,276 C123,292 122,312 118,330 L105,330 C103,312 103,292 104,276 Z' }
  ]
}

/** Muscles visibles de face / de dos. Sert à afficher un point sur l'autre vue. */
export const MUSCLES_BY_VIEW: Record<MannequinView, MuscleGroup[]> = {
  front: ['shoulders', 'chest', 'core', 'obliques', 'biceps', 'forearms', 'quads', 'calves'],
  back: ['shoulders', 'back', 'triceps', 'forearms', 'lower_back', 'glutes', 'hamstrings', 'calves']
}

/** cardio_upper / cardio_lower n'ont pas de zone : ce ne sont pas des muscles. */
export const NON_ANATOMICAL: MuscleGroup[] = ['cardio_upper', 'cardio_lower']
