import { METHOD_LABELS as WORKOUT_METHOD_LABELS, MUSCLE_GROUP_LABELS } from '../../types'

export type PdfTheme = 'dark' | 'light'

export const DARK = {
	bg: '#0d0c0b',
	surface: '#201d1a',
	border: '#2e2a26',
	orange: '#FF5A1F',
	white: '#F2EDE6',
	muted: '#9d958a',
	text: '#F2EDE6',
	textMuted: '#9d958a',
	headerBg: '#161412',
	rowAlt: '#1a1715',
}

export const LIGHT = {
	bg: '#FFFFFF',
	surface: '#EFECE6',
	border: '#DDD8D0',
	orange: '#FF5A1F',
	white: '#FFFFFF',
	muted: '#5f5a53',
	text: '#17150f',
	textMuted: '#5f5a53',
	headerBg: '#161412',
	rowAlt: '#EFECE6',
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

	return `wodbud-${slug}-${variant}-${theme}.pdf`
}
