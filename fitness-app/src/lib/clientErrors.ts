/** Erreurs remontées par les utilisateurs (migration 070), regroupées pour l'administration. */
export interface ClientErrorRow {
  id: number
  created_at: string
  kind: string
  message: string
  path: string | null
  app_version: string | null
}

export interface ClientErrorGroup {
  kind: string
  message: string
  count: number
  lastAt: string
  paths: string[]
  versions: string[]
}

/** Même type, même message : une ligne, avec le nombre, la dernière fois, les pages et les versions. */
export function groupClientErrors(rows: ClientErrorRow[]): ClientErrorGroup[] {
  const groups = new Map<string, ClientErrorGroup>()
  for (const r of rows) {
    const key = `${r.kind}|${r.message}`
    const g = groups.get(key) ?? { kind: r.kind, message: r.message, count: 0, lastAt: r.created_at, paths: [], versions: [] }
    g.count += 1
    if (r.created_at > g.lastAt) g.lastAt = r.created_at
    if (r.path && !g.paths.includes(r.path)) g.paths.push(r.path)
    if (r.app_version && !g.versions.includes(r.app_version)) g.versions.push(r.app_version)
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt))
}
