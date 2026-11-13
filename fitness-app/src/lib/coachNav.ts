import type { NavIconName } from '../components/navigation/NavIcon'

/**
 * Menu du coach (phase 3, 3.4 ; « Groupes » en 3.6) : cinq entrées. Chaque
 * entrée regroupe des pages ; la page ouverte montre des onglets vers les
 * autres pages de son groupe. Les adresses ne changent pas.
 */
export interface NavLeaf {
  id: string
  labelKey: string
  /** Libellé court pour les onglets de section, s'il diffère. */
  tabKey?: string
  ns?: 'common' | 'workouts'
  icon: NavIconName
  path: string
}

export type NavGroupId = 'admin' | 'today' | 'classes' | 'program' | 'training' | 'more'

export interface NavGroup {
  id: NavGroupId
  labelKey: string
  /** Libellé court de la barre du bas (téléphone). */
  tabKey: string
  icon: NavIconName
  leaves: NavLeaf[]
  /** Page ouverte par l'entrée : la première de son groupe. */
  path: string
  /** Autres débuts d'adresse rattachés au groupe (ex. un tableau blanc). */
  extra: string[]
}

export const LEAVES: NavLeaf[] = [
  { id: 'admin', labelKey: 'nav.admin', icon: 'admin', path: '/dashboard/admin' },
  { id: 'today', labelKey: 'nav.today', icon: 'home', path: '/dashboard/today' },
  { id: 'groups', labelKey: 'nav.groups', tabKey: 'nav.tab_groups_all', icon: 'classes', path: '/dashboard/groups' },
  { id: 'classes', labelKey: 'nav.classes', tabKey: 'nav.tab_classes', icon: 'classes', path: '/dashboard/classes' },
  { id: 'vote', labelKey: 'nav.vote', icon: 'vote', path: '/dashboard/vote' },
  { id: 'workout', labelKey: 'new', tabKey: 'nav.tab_new', ns: 'workouts', icon: 'workout', path: '/dashboard/workout' },
  { id: 'library', labelKey: 'nav.library', icon: 'library', path: '/dashboard/workouts' },
  { id: 'exercises', labelKey: 'nav.exercises', icon: 'exercises', path: '/dashboard/exercises' },
  { id: 'session', labelKey: 'nav.session', icon: 'session', path: '/dashboard/session' },
  { id: 'journal', labelKey: 'nav.journal', icon: 'calendar', path: '/dashboard/journal' },
  { id: 'records', labelKey: 'nav.records', icon: 'records', path: '/dashboard/records' },
  { id: 'rank', labelKey: 'nav.rank', icon: 'rank', path: '/dashboard/rank' },
  { id: 'communities', labelKey: 'nav.communities', icon: 'community', path: '/dashboard/communities' },
  { id: 'ai', labelKey: 'nav.ai', icon: 'ai', path: '/dashboard/ai' },
  { id: 'settings', labelKey: 'nav.settings', icon: 'settings', path: '/dashboard/settings' }
]

const GROUPS: Array<Omit<NavGroup, 'leaves' | 'path' | 'extra'> & { leafIds: string[]; extra?: string[] }> = [
  { id: 'admin', labelKey: 'nav.admin', tabKey: 'nav.tab_admin', icon: 'admin', leafIds: ['admin'] },
  { id: 'today', labelKey: 'nav.today', tabKey: 'nav.tab_today', icon: 'home', leafIds: ['today'] },
  { id: 'classes', labelKey: 'nav.group_groups', tabKey: 'nav.tab_groups', icon: 'classes', leafIds: ['groups', 'classes', 'communities', 'vote'], extra: ['/dashboard/whiteboard'] },
  { id: 'program', labelKey: 'nav.group_program', tabKey: 'nav.tab_program', icon: 'workout', leafIds: ['workout', 'library', 'exercises'] },
  { id: 'training', labelKey: 'nav.group_training', tabKey: 'nav.tab_training', icon: 'session', leafIds: ['session', 'journal', 'records', 'rank'] },
  { id: 'more', labelKey: 'nav.more', tabKey: 'nav.more', icon: 'grid', leafIds: ['ai', 'settings'] }
]

/**
 * Les groupes visibles pour une personne, d'après les pages auxquelles elle
 * a droit. Sans « Mes cours » (l'admin), les votes passent dans « Plus ».
 */
export function buildNav(visible: ReadonlySet<string>): NavGroup[] {
  const byId = new Map(LEAVES.map((l) => [l.id, l]))
  const pick = (ids: string[]) => ids.filter((id) => visible.has(id)).map((id) => byId.get(id)!)
  const groups = GROUPS.map((g) => ({ ...g, leaves: pick(g.leafIds) }))
  const classes = groups.find((g) => g.id === 'classes')!
  if (!classes.leaves.some((l) => l.id === 'classes')) {
    groups.find((g) => g.id === 'more')!.leaves.unshift(...classes.leaves)
    classes.leaves = []
  }
  return groups
    .filter((g) => g.leaves.length > 0)
    .map((g) => ({ id: g.id, labelKey: g.labelKey, tabKey: g.tabKey, icon: g.icon, leaves: g.leaves, path: g.leaves[0].path, extra: g.extra ?? [] }))
}

/** L'adresse est-elle cette page, ou une de ses sous-pages ? (« /workout » n'attrape pas « /workouts ») */
export function onPath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function activeGroup(groups: NavGroup[], pathname: string): NavGroup | null {
  return groups.find((g) => g.leaves.some((l) => onPath(pathname, l.path)) || g.extra.some((p) => onPath(pathname, p))) ?? null
}

export function activeLeaf(group: NavGroup | null, pathname: string): NavLeaf | null {
  return group?.leaves.find((l) => onPath(pathname, l.path)) ?? null
}

/** Débuts d'adresse qui allument l'entrée d'un groupe. */
export function groupPaths(group: NavGroup): string[] {
  return [...group.leaves.map((l) => l.path), ...group.extra]
}
