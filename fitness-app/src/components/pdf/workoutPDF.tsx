import { Document, Image, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { Workout } from '../../types'
import { formatDate, METHOD_LABELS, MUSCLE_LABELS, tokens, type PdfTheme } from './pdfTokens'

interface Props {
	workout: Workout & { title?: string }
	theme: PdfTheme
	qrDataUrls: Record<string, string>
}

function makeStyles(theme: PdfTheme) {
	const t = tokens(theme)

	return StyleSheet.create({
		page: {
			backgroundColor: t.bg,
			paddingHorizontal: 36,
			paddingVertical: 32,
			fontFamily: 'Helvetica',
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: 20,
			paddingBottom: 14,
			borderBottomWidth: 1,
			borderBottomColor: t.border,
		},
		logoBox: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		logoText: {
			fontSize: 20,
			fontFamily: 'Helvetica-Bold',
			color: t.text,
			letterSpacing: 2,
			textTransform: 'uppercase',
		},
		logoAccent: {
			color: t.orange,
		},
		headerMeta: {
			alignItems: 'flex-end',
		},
		headerDate: {
			fontSize: 8,
			color: t.textMuted,
			letterSpacing: 1,
			textTransform: 'uppercase',
		},
		titleBlock: {
			marginBottom: 18,
		},
		methodBadge: {
			backgroundColor: t.orange,
			color: '#000000',
			fontSize: 7,
			fontFamily: 'Helvetica-Bold',
			letterSpacing: 1.5,
			textTransform: 'uppercase',
			paddingHorizontal: 6,
			paddingVertical: 3,
			alignSelf: 'flex-start',
			marginBottom: 6,
		},
		workoutTitle: {
			fontSize: 26,
			fontFamily: 'Helvetica-Bold',
			color: t.text,
			textTransform: 'uppercase',
			letterSpacing: 1,
			lineHeight: 1.1,
		},
		duration: {
			fontSize: 9,
			color: t.textMuted,
			marginTop: 4,
			letterSpacing: 0.5,
		},
		notes: {
			fontSize: 9,
			color: t.textMuted,
			marginTop: 6,
			fontStyle: 'italic',
			lineHeight: 1.5,
		},
		summaryBar: {
			flexDirection: 'row',
			marginBottom: 16,
			paddingVertical: 10,
			paddingHorizontal: 12,
			backgroundColor: t.surface,
			borderLeftWidth: 3,
			borderLeftColor: t.orange,
		},
		summaryItem: {
			alignItems: 'center',
			marginRight: 16,
		},
		summaryValue: {
			fontSize: 14,
			fontFamily: 'Helvetica-Bold',
			color: t.text,
		},
		summaryLabel: {
			fontSize: 6.5,
			color: t.textMuted,
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginTop: 2,
		},
		tableHeader: {
			flexDirection: 'row',
			backgroundColor: t.headerBg,
			paddingVertical: 7,
			paddingHorizontal: 10,
			marginBottom: 1,
		},
		tableHeaderText: {
			fontSize: 7,
			fontFamily: 'Helvetica-Bold',
			color: t.muted,
			textTransform: 'uppercase',
			letterSpacing: 1,
		},
		row: {
			flexDirection: 'row',
			paddingVertical: 10,
			paddingHorizontal: 10,
			borderBottomWidth: 1,
			borderBottomColor: t.border,
			alignItems: 'flex-start',
		},
		rowAlt: {
			backgroundColor: t.rowAlt,
		},
		colPos: { width: 24 },
		colExo: { flex: 1 },
		colMuscle: { width: 90 },
		colSets: { width: 36, alignItems: 'center' },
		colReps: { width: 44, alignItems: 'center' },
		colWeight: { width: 52, alignItems: 'center' },
		colRest: { width: 44, alignItems: 'center' },
		colQr: { width: 44, alignItems: 'center' },
		posText: {
			fontSize: 11,
			fontFamily: 'Helvetica-Bold',
			color: t.orange,
		},
		exoName: {
			fontSize: 10,
			fontFamily: 'Helvetica-Bold',
			color: t.text,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
		},
		exoDesc: {
			fontSize: 7.5,
			color: t.textMuted,
			marginTop: 2,
			lineHeight: 1.5,
		},
		musclePrimary: {
			fontSize: 7,
			color: t.orange,
			letterSpacing: 0.5,
			textTransform: 'uppercase',
		},
		muscleSecondary: {
			fontSize: 6.5,
			color: t.textMuted,
			marginTop: 1,
		},
		cellValue: {
			fontSize: 10,
			fontFamily: 'Helvetica-Bold',
			color: t.text,
			textAlign: 'center',
		},
		cellLabel: {
			fontSize: 6.5,
			color: t.textMuted,
			textAlign: 'center',
			marginTop: 1,
		},
		qrImage: {
			width: 36,
			height: 36,
		},
		qrLabel: {
			fontSize: 5.5,
			color: t.textMuted,
			textAlign: 'center',
			marginTop: 2,
		},
		noVideo: {
			fontSize: 6,
			color: t.border,
			textAlign: 'center',
		},
		footer: {
			position: 'absolute',
			bottom: 20,
			left: 36,
			right: 36,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingTop: 10,
			borderTopWidth: 1,
			borderTopColor: t.border,
		},
		footerText: {
			fontSize: 7,
			color: t.textMuted,
			letterSpacing: 0.5,
		},
		footerBrand: {
			fontSize: 7,
			fontFamily: 'Helvetica-Bold',
			color: t.orange,
			letterSpacing: 1,
		},
	})
}

export function WorkoutPdfFull({ workout, theme, qrDataUrls }: Props) {
	const s = makeStyles(theme)
	const totalSets = workout.exercises.reduce((acc, exercise) => acc + (exercise.sets ?? 0), 0)
	const workoutTitle = workout.title ?? workout.name

	return (
		<Document title={workoutTitle} author="WODBUD" subject="Séance d'entraînement">
			<Page size="A4" style={s.page}>
				<View style={s.header}>
					<View style={s.logoBox}>
						<Text style={s.logoText}>
							WOD<Text style={s.logoAccent}>BUD</Text>
						</Text>
					</View>
					<View style={s.headerMeta}>
						<Text style={s.headerDate}>{formatDate()}</Text>
					</View>
				</View>

				<View style={s.titleBlock}>
					<Text style={s.methodBadge}>{METHOD_LABELS[workout.method] ?? workout.method}</Text>
					<Text style={s.workoutTitle}>{workoutTitle}</Text>
					{workout.duration_minutes ? <Text style={s.duration}>Duration: {workout.duration_minutes} minutes</Text> : null}
					{workout.notes ? <Text style={s.notes}>{workout.notes}</Text> : null}
				</View>

				<View style={s.summaryBar}>
					<View style={s.summaryItem}>
						<Text style={s.summaryValue}>{workout.exercises.length}</Text>
						<Text style={s.summaryLabel}>Exercices</Text>
					</View>
					{totalSets > 0 ? (
						<View style={s.summaryItem}>
							<Text style={s.summaryValue}>{totalSets}</Text>
							<Text style={s.summaryLabel}>Séries totales</Text>
						</View>
					) : null}
					{workout.duration_minutes ? (
						<View style={s.summaryItem}>
							<Text style={s.summaryValue}>{workout.duration_minutes}'</Text>
							<Text style={s.summaryLabel}>Durée</Text>
						</View>
					) : null}
				</View>

				<View style={s.tableHeader}>
					<View style={s.colPos}><Text style={s.tableHeaderText}>#</Text></View>
					<View style={s.colExo}><Text style={s.tableHeaderText}>Exercice</Text></View>
					<View style={s.colMuscle}><Text style={s.tableHeaderText}>Muscle</Text></View>
					<View style={s.colSets}><Text style={s.tableHeaderText}>Séries</Text></View>
					<View style={s.colReps}><Text style={s.tableHeaderText}>Reps</Text></View>
					<View style={s.colWeight}><Text style={s.tableHeaderText}>Charge</Text></View>
					<View style={s.colRest}><Text style={s.tableHeaderText}>Repos</Text></View>
					<View style={s.colQr}><Text style={s.tableHeaderText}>Vidéo</Text></View>
				</View>

				{workout.exercises.map((workoutExercise, index) => (
					<View key={workoutExercise.id} style={index % 2 === 1 ? [s.row, s.rowAlt] : s.row}>
						<View style={s.colPos}>
							<Text style={s.posText}>{workoutExercise.position}</Text>
						</View>

						<View style={s.colExo}>
							<Text style={s.exoName}>{workoutExercise.exercise.name}</Text>
							{workoutExercise.exercise.description ? <Text style={s.exoDesc}>{workoutExercise.exercise.description}</Text> : null}
							{workoutExercise.notes ? (
								<Text style={[s.exoDesc, { fontStyle: 'italic' }]}>
									Note: {workoutExercise.notes}
								</Text>
							) : null}
						</View>

						<View style={s.colMuscle}>
							<Text style={s.musclePrimary}>
								{MUSCLE_LABELS[workoutExercise.exercise.primary_muscle] ?? workoutExercise.exercise.primary_muscle}
							</Text>
							{workoutExercise.exercise.secondary_muscles.slice(0, 2).map((muscle) => (
								<Text key={muscle} style={s.muscleSecondary}>
									{MUSCLE_LABELS[muscle] ?? muscle}
								</Text>
							))}
						</View>

						<View style={s.colSets}>
							<Text style={s.cellValue}>{workoutExercise.sets ?? '—'}</Text>
							<Text style={s.cellLabel}>séries</Text>
						</View>

						<View style={s.colReps}>
							<Text style={s.cellValue}>{workoutExercise.reps ?? '—'}</Text>
							<Text style={s.cellLabel}>reps</Text>
						</View>

						<View style={s.colWeight}>
							<Text style={s.cellValue}>{workoutExercise.weight ?? '—'}</Text>
						</View>

						<View style={s.colRest}>
							{workoutExercise.rest_seconds ? (
								<>
									<Text style={s.cellValue}>{workoutExercise.rest_seconds}"</Text>
									<Text style={s.cellLabel}>repos</Text>
								</>
							) : (
								<Text style={s.cellValue}>—</Text>
							)}
						</View>

						<View style={s.colQr}>
							{workoutExercise.exercise.video_url && qrDataUrls[workoutExercise.exercise.id] ? (
								<>
									<Link src={workoutExercise.exercise.video_url}>
										<Image style={s.qrImage} src={qrDataUrls[workoutExercise.exercise.id]} />
									</Link>
									<Text style={s.qrLabel}>Scanner</Text>
								</>
							) : (
								<Text style={s.noVideo}>—</Text>
							)}
						</View>
					</View>
				))}

				<View style={s.footer} fixed>
					<Text style={s.footerText}>
						Généré par <Text style={s.footerBrand}>WODBUD</Text> · {formatDate()}
					</Text>
					<Text
						style={s.footerText}
						render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
					/>
				</View>
			</Page>
		</Document>
	)
}
