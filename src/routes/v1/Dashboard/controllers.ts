import { FastifyReply, FastifyRequest } from "fastify"
import Dashboard from "../../../models/Dashboard"
import { Character, User } from "../../../models"
import CharacterDashboard from "../../../models/CharacterDashboard"

const ALLOWED_PANEL_TYPES = [
  "comments",
  "information",
  "featured_gallery",
  "featured_artwork",
  "reference_sheet",
  "featured_character",
  "popular_character",
  "multiple_characters",
  "recent_artworks",
  "multiple_artworks",
  "popular_artwork",
  "multiple_galleries",
  "featured_listing",
  "recent_listings",
  "commission_queue",
] as const

const CHARACTER_ONLY_PANELS = new Set(["reference_sheet"])
const USER_ONLY_PANELS = new Set([
  "featured_character",
  "popular_character",
  "multiple_characters",
  "multiple_galleries",
  "featured_listing",
  "recent_listings",
  "commission_queue",
])

function sanitizeSettings(
  component: string,
  settings: Record<string, unknown> | undefined
) {
  const safe: Record<string, string> = {}
  const input = settings ?? {}

  if (typeof input.artworkId === "string") safe.artworkId = input.artworkId
  if (typeof input.artworkIds === "string") safe.artworkIds = input.artworkIds
  if (typeof input.characterSlug === "string") safe.characterSlug = input.characterSlug
  if (typeof input.characterSlugs === "string") safe.characterSlugs = input.characterSlugs
  if (typeof input.refSheetId === "string") safe.refSheetId = input.refSheetId
  if (typeof input.folderId === "string") safe.folderId = input.folderId
  if (typeof input.customTitle === "string") safe.customTitle = input.customTitle.slice(0, 120)
  if (typeof input.limit === "string") safe.limit = input.limit

  if (component === "customHTML" && typeof input.html === "string") {
    safe.html = input.html
  }

  return safe
}

function isAllowedPanelType(component: string, context: "user" | "character") {
  if (!ALLOWED_PANEL_TYPES.includes(component as (typeof ALLOWED_PANEL_TYPES)[number])) {
    return false
  }

  if (context === "user" && CHARACTER_ONLY_PANELS.has(component)) {
    return false
  }

  if (context === "character" && USER_ONLY_PANELS.has(component)) {
    return false
  }

  return true
}

export const getUserPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { handle } = request.params as { handle: string }

  if (!handle) {
    return reply.code(400).send({ error: "User handle is required" })
  }

  let dashboard: Dashboard | null
  dashboard = await request.server.db
    .getRepository(Dashboard)
    .findOne({ where: { user: { handle: handle } } })
  if (!dashboard) {
    const user = await request.server.db
      .getRepository(User)
      .findOne({ where: { handle: handle } })
    if (!user) {
      return reply.code(404).send({ error: "User not found" })
    }
    dashboard = await request.server.db.getRepository(Dashboard).save({
      user,
      panels: [],
    })
  }
  return reply.code(200).send(dashboard.panels)
}

export const setHTMLPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { html } = request.body as { html: string }

  if (!html) {
    return reply.code(400).send({ error: "HTML content is required" })
  }

  const dashboard = await request.server.db
    .getRepository(Dashboard)
    .findOne({ where: { user: { id: profileId } } })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  const customHTMLPanel = dashboard.panels.find((p) => p.type === "customHTML")

  if (customHTMLPanel) {
    customHTMLPanel.settings.html = html
  } else {
    dashboard.panels.push({
      id: `panel-${Date.now()}`,
      type: "customHTML",
      position: { row: 1, col: 1 },
      settings: { html },
    })
  }

  await request.server.db.getRepository(Dashboard).save(dashboard)
  return reply.send(dashboard)
}

export const setPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { position, component, settings } = request.body as {
    position: { row: number; col: number }
    component: string
    settings?: Record<string, unknown>
  }

  if (!position || !component) {
    return reply.code(400).send({ error: "Position and component are required" })
  }

  if (!isAllowedPanelType(component, "user")) {
    return reply.code(400).send({ error: "Invalid component type" })
  }

  const dashboard = await request.server.db
    .getRepository(Dashboard)
    .findOne({ where: { user: { id: profileId } } })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  const panelIndex = dashboard.panels.findIndex(
    (p) => p.position.row === position.row && p.position.col === position.col
  )

  const newPanel = {
    id: `panel-${Date.now()}`,
    type: component,
    position,
    settings: sanitizeSettings(component, settings),
  }

  if (panelIndex !== -1) {
    dashboard.panels[panelIndex] = newPanel
  } else {
    dashboard.panels.push(newPanel)
  }

  await request.server.db.getRepository(Dashboard).save(dashboard)
  return reply.send(dashboard)
}

export const resetPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }

  const dashboard = await request.server.db
    .getRepository(Dashboard)
    .findOne({ where: { user: { id: profileId } } })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  dashboard.panels = []
  await request.server.db.getRepository(Dashboard).save(dashboard)
  return reply.send(dashboard)
}

export const getCharacterPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { characterName } = request.params as { characterName: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName },
    relations: ["owner"],
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })

  let dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { slug: characterName } },
  })

  if (!dashboard) {
    dashboard = await request.server.db.getRepository(CharacterDashboard).save({
      character,
      panels: [],
    })
  }

  return reply.send(dashboard.panels)
}

export const setCharacterPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { characterName } = request.params as { characterName: string }
  const { position, component, settings } = request.body as {
    position: { row: number; col: number }
    component: string
    settings?: Record<string, unknown>
  }

  if (!characterName || !position || !component) {
    return reply.code(400).send({ error: "Character name, position, and component are required" })
  }

  if (!isAllowedPanelType(component, "character")) {
    return reply.code(400).send({ error: "Invalid component type" })
  }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName, owner: { id: profileId } },
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  let dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { slug: characterName } },
  })

  if (!dashboard) {
    dashboard = await request.server.db.getRepository(CharacterDashboard).save({
      character,
      panels: [],
    })
  }

  const panelIndex = dashboard.panels.findIndex(
    (p) => p.position.row === position.row && p.position.col === position.col
  )

  const newPanel = {
    id: `panel-${Date.now()}`,
    type: component,
    position,
    settings: sanitizeSettings(component, settings),
  }

  if (panelIndex !== -1) {
    dashboard.panels[panelIndex] = newPanel
  } else {
    dashboard.panels.push(newPanel)
  }

  await request.server.db.getRepository(CharacterDashboard).save(dashboard)
  return reply.send(dashboard)
}

export const setCharacterHTMLPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { characterName } = request.params as { characterName: string }
  const { html } = request.body as { html: string }

  if (!html || !characterName) {
    return reply.code(400).send({ error: "HTML content and character name are required" })
  }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName, owner: { id: profileId } },
    relations: ["owner"],
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  let dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { id: character.id } },
  })

  if (!dashboard) {
    dashboard = await request.server.db.getRepository(CharacterDashboard).save({
      character,
      panels: [],
    })
  }

  const customHTMLPanel = dashboard.panels.find((p) => p.type === "customHTML")

  if (customHTMLPanel) {
    customHTMLPanel.settings.html = html
  } else {
    dashboard.panels.push({
      id: `panel-${Date.now()}`,
      type: "customHTML",
      position: { row: 1, col: 1 },
      settings: { html },
    })
  }

  await request.server.db.getRepository(CharacterDashboard).save(dashboard)
  return reply.send(dashboard)
}

export const resetCharacterPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { characterName } = request.params as { characterName: string }

  if (!characterName) return reply.code(400).send({ error: "Character name is required" })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName, owner: { id: profileId } },
    relations: ["owner"],
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  const dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { id: character.id } },
  })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  dashboard.panels = []
  await request.server.db.getRepository(CharacterDashboard).save(dashboard)
  return reply.send(dashboard)
}
