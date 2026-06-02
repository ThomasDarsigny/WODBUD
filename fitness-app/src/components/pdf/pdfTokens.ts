import { METHOD_LABELS as WORKOUT_METHOD_LABELS, MUSCLE_GROUP_LABELS } from '../../types'

export type PdfTheme = 'dark' | 'light'

export const DARK = {
	bg: '#0a0a0a',
	surface: '#1a1a1a',
	border: '#2a2a2a',
	orange: '#FF4D00',
	white: '#F0EBE4',
	muted: '#7a7570',
	text: '#F0EBE4',
	textMuted: '#7a7570',
	headerBg: '#111111',
	rowAlt: '#141414',
}

export const LIGHT = {
	bg: '#FFFFFF',
	surface: '#F7F6F4',
	border: '#E0DDD9',
	orange: '#FF4D00',
	white: '#FFFFFF',
	muted: '#888880',
	text: '#111111',
	textMuted: '#666660',
	headerBg: '#111111',
	rowAlt: '#F7F6F4',
}

export function tokens(theme: PdfTheme) {
	return theme === 'dark' ? DARK : LIGHT
}

export const METHOD_LABELS = WORKOUT_METHOD_LABELS

export const MUSCLE_LABELS: Record<string, string> = {
	...MUSCLE_GROUP_LABELS,
	abs: 'Abdominaux',
	obliques: 'Obliques',
	lower_back: 'Bas du dos',
	quadriceps: 'Quadriceps',
	quads: 'Quadriceps',
	core: 'Abdominaux',
	full_body: 'Corps entier',
}

export function formatDate(date?: string): string {
	return new Date(date ?? Date.now()).toLocaleDateString('fr-CA', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
}

export function pdfFileName(title: string, variant: 'complet' | 'abrege', theme: PdfTheme): string {
	const slug = title
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')

	return `forgex-${slug}-${variant}-${theme}.pdf`
}
