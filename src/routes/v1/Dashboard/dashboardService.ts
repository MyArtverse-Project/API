import type { DataSource, Repository } from "typeorm"
import UserDashboard from "../../../models/Dashboard"
import CharacterDashboard from "../../../models/CharacterDashboard"
import { Character, User } from "../../../models"

export type DashboardPanelRecord = {
  id: string
  type: string
  position: { row: number; col: number }
  settings: Record<string, unknown>
}

function panelSlotKey(panel: { position: { row: number; col: number } }) {
  return `${panel.position.row}:${panel.position.col}`
}

async function loadLegacyUserPanels(
  db: DataSource,
  userId: string
): Promise<DashboardPanelRecord[] | null> {
  try {
    const rows = (await db.query(
      `SELECT panels FROM dashboard WHERE "userId" = $1 ORDER BY id ASC`,
      [userId]
    )) as Array<{ panels?: DashboardPanelRecord[] }>

    if (!rows.length) return null

    return rows.reduce<DashboardPanelRecord[]>(
      (merged, row) => mergePanels(merged, row.panels ?? []),
      []
    )
  } catch {
    return null
  }
}

async function loadLegacyCharacterPanels(
  db: DataSource,
  characterId: string
): Promise<DashboardPanelRecord[] | null> {
  try {
    const rows = (await db.query(
      `SELECT panels FROM dashboard WHERE "characterId" = $1 ORDER BY id ASC`,
      [characterId]
    )) as Array<{ panels?: DashboardPanelRecord[] }>

    if (!rows.length) return null

    return rows.reduce<DashboardPanelRecord[]>(
      (merged, row) => mergePanels(merged, row.panels ?? []),
      []
    )
  } catch {
    return null
  }
}

function mergePanels(target: DashboardPanelRecord[], source: DashboardPanelRecord[]) {
  const merged = [...target]

  for (const panel of source) {
    const slot = panelSlotKey(panel)
    const existingIndex = merged.findIndex((item) => panelSlotKey(item) === slot)

    if (existingIndex === -1) {
      merged.push(panel)
      continue
    }

    if (panel.type === "customHTML" && merged[existingIndex].type !== "customHTML") {
      merged[existingIndex] = panel
    }
  }

  const customHtml = source.find((panel) => panel.type === "customHTML")
  if (customHtml && !merged.some((panel) => panel.type === "customHTML")) {
    merged.push(customHtml)
  }

  return merged
}

export function assignPanels(
  dashboard: { panels: DashboardPanelRecord[] },
  panels: DashboardPanelRecord[]
) {
  dashboard.panels = panels
}

export async function resolveUserDashboard(
  db: DataSource,
  userId: string
): Promise<UserDashboard> {
  const repo = db.getRepository(UserDashboard)
  const dashboards = await repo.find({
    where: { user: { id: userId } },
    relations: { user: true },
    order: { id: "ASC" },
  })

  if (dashboards.length === 0) {
    const user = await db.getRepository(User).findOne({ where: { id: userId } })
    if (!user) {
      throw new Error("USER_NOT_FOUND")
    }

    const legacyPanels = await loadLegacyUserPanels(db, userId)
    return repo.save({ user, panels: legacyPanels ?? [] })
  }

  if (dashboards.length === 1) {
    return dashboards[0]
  }

  const primary = dashboards.reduce((best, current) =>
    current.panels.length >= best.panels.length ? current : best
  )

  let mergedPanels = [...primary.panels]
  for (const duplicate of dashboards) {
    if (duplicate.id === primary.id) continue
    mergedPanels = mergePanels(mergedPanels, duplicate.panels)
  }

  assignPanels(primary, mergedPanels)
  await repo.save(primary)
  await repo.remove(dashboards.filter((dashboard) => dashboard.id !== primary.id))

  return primary
}

export async function resolveCharacterDashboard(
  db: DataSource,
  characterId: string
): Promise<CharacterDashboard> {
  const repo = db.getRepository(CharacterDashboard)
  const dashboards = await repo.find({
    where: { character: { id: characterId } },
    relations: { character: true },
    order: { id: "ASC" },
  })

  if (dashboards.length === 0) {
    const character = await db.getRepository(Character).findOne({
      where: { id: characterId },
    })
    if (!character) {
      throw new Error("CHARACTER_NOT_FOUND")
    }

    const legacyPanels = await loadLegacyCharacterPanels(db, characterId)
    return repo.save({ character, panels: legacyPanels ?? [] })
  }

  if (dashboards.length === 1) {
    return dashboards[0]
  }

  const primary = dashboards.reduce((best, current) =>
    current.panels.length >= best.panels.length ? current : best
  )

  let mergedPanels = [...primary.panels]
  for (const duplicate of dashboards) {
    if (duplicate.id === primary.id) continue
    mergedPanels = mergePanels(mergedPanels, duplicate.panels)
  }

  assignPanels(primary, mergedPanels)
  await repo.save(primary)
  await repo.remove(dashboards.filter((dashboard) => dashboard.id !== primary.id))

  return primary
}

export function upsertPanelAtSlot(
  dashboard: { panels: DashboardPanelRecord[] },
  position: { row: number; col: number },
  component: string,
  settings: Record<string, unknown>
) {
  const panelIndex = dashboard.panels.findIndex(
    (panel) => panel.position.row === position.row && panel.position.col === position.col
  )

  const nextPanel: DashboardPanelRecord = {
    id:
      panelIndex !== -1
        ? dashboard.panels[panelIndex].id
        : `panel-${Date.now()}-${position.row}-${position.col}`,
    type: component,
    position,
    settings,
  }

  const panels =
    panelIndex !== -1
      ? dashboard.panels.map((panel, index) => (index === panelIndex ? nextPanel : panel))
      : [...dashboard.panels, nextPanel]

  assignPanels(dashboard, panels)
}

export function upsertCustomHtmlPanel(
  dashboard: { panels: DashboardPanelRecord[] },
  html: string
) {
  const panelIndex = dashboard.panels.findIndex((panel) => panel.type === "customHTML")

  if (panelIndex !== -1) {
    const panels = dashboard.panels.map((panel, index) =>
      index === panelIndex
        ? {
            ...panel,
            settings: { ...panel.settings, html },
          }
        : panel
    )
    assignPanels(dashboard, panels)
    return
  }

  assignPanels(dashboard, [
    ...dashboard.panels,
    {
      id: `panel-${Date.now()}-html`,
      type: "customHTML",
      position: { row: 1, col: 1 },
      settings: { html },
    },
  ])
}

export async function saveUserDashboard(
  repo: Repository<UserDashboard>,
  dashboard: UserDashboard
) {
  assignPanels(dashboard, [...dashboard.panels])
  return repo.save(dashboard)
}

export async function saveCharacterDashboard(
  repo: Repository<CharacterDashboard>,
  dashboard: CharacterDashboard
) {
  assignPanels(dashboard, [...dashboard.panels])
  return repo.save(dashboard)
}
