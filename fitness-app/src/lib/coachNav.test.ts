import { describe, expect, it } from 'vitest'
import { activeGroup, activeLeaf, buildNav, LEAVES, onPath } from './coachNav'

const coach = new Set(LEAVES.map((l) => l.id).filter((id) => id !== 'admin'))
const admin = new Set(LEAVES.map((l) => l.id).filter((id) => !['ai', 'classes', 'today', 'groups'].includes(id)))

describe('menu du coach', () => {
  it('ramène le coach à cinq entrées, chacune ouvrant sa première page', () => {
    const nav = buildNav(coach)
    expect(nav.map((g) => g.id)).toEqual(['today', 'classes', 'program', 'training', 'more'])
    expect(nav.map((g) => g.path)).toEqual(['/dashboard/today', '/dashboard/groups', '/dashboard/workout', '/dashboard/session', '/dashboard/ai'])
    expect(nav.find((g) => g.id === 'classes')!.leaves.map((l) => l.id)).toEqual(['groups', 'classes', 'communities', 'vote'])
    expect(nav.flatMap((g) => g.leaves).length).toBe(14)
  })

  it('pour l’admin : son espace en tête, et communautés et votes dans « Plus » faute de cours', () => {
    const nav = buildNav(admin)
    expect(nav.map((g) => g.id)).toEqual(['admin', 'program', 'training', 'more'])
    expect(nav.find((g) => g.id === 'more')!.leaves.map((l) => l.id)).toEqual(['communities', 'vote', 'settings'])
  })

  it('reconnaît la page ouverte, sans confondre /workout et /workouts', () => {
    const nav = buildNav(coach)
    expect(onPath('/dashboard/workouts', '/dashboard/workout')).toBe(false)
    expect(activeGroup(nav, '/dashboard/workouts')?.id).toBe('program')
    expect(activeLeaf(activeGroup(nav, '/dashboard/workouts'), '/dashboard/workouts')?.id).toBe('library')
    expect(activeGroup(nav, '/dashboard/communities/abc')?.id).toBe('classes')
    expect(activeGroup(nav, '/dashboard/groups')?.id).toBe('classes')
    expect(activeGroup(nav, '/dashboard/whiteboard/plan1')?.id).toBe('classes')
    expect(activeLeaf(activeGroup(nav, '/dashboard/whiteboard/plan1'), '/dashboard/whiteboard/plan1')).toBeNull()
    expect(activeGroup(nav, '/dashboard/inconnu')).toBeNull()
  })
})
