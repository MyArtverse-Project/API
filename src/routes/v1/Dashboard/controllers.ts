import { FastifyReply, FastifyRequest } from "fastify"
import UserDashboard from "../../../models/Dashboard"
import { Character, User } from "../../../models"
import CharacterDashboard from "../../../models/CharacterDashboard"
import { PANEL_COMPONENT_TYPES } from "./panelTypes"
import {
  resolveCharacterDashboard,
  resolveUserDashboard,
  saveCharacterDashboard,
  saveUserDashboard,
  upsertCustomHtmlPanel,
  upsertPanelAtSlot,
} from "./dashboardService"

const ALLOWED_PANEL_TYPES = PANEL_COMPONENT_TYPES

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

  const user = await request.server.db.getRepository(User).findOne({ where: { handle } })
  if (!user) {
    return reply.code(404).send({ error: "User not found" })
  }

  try {
    const dashboard = await resolveUserDashboard(request.server.db, user.id)
    return reply.code(200).send(dashboard.panels)
  } catch {
    return reply.code(404).send({ error: "User not found" })
  }
}

export const setHTMLPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { html } = request.body as { html: string }

  if (!html) {
    return reply.code(400).send({ error: "HTML content is required" })
  }

  const dashboard = await resolveUserDashboard(request.server.db, profileId)
  upsertCustomHtmlPanel(dashboard, html)
  await saveUserDashboard(request.server.db.getRepository(UserDashboard), dashboard)

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

  const dashboard = await resolveUserDashboard(request.server.db, profileId)
  upsertPanelAtSlot(
    dashboard,
    position,
    component,
    sanitizeSettings(component, settings)
  )
  await saveUserDashboard(request.server.db.getRepository(UserDashboard), dashboard)

  return reply.send(dashboard)
}

export const resetPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }

  const dashboard = await resolveUserDashboard(request.server.db, profileId)
  dashboard.panels = []
  await saveUserDashboard(request.server.db.getRepository(UserDashboard), dashboard)

  return reply.send(dashboard)
}

export const getCharacterPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { characterName } = request.params as { characterName: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName },
    relations: ["owner"],
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })

  const dashboard = await resolveCharacterDashboard(request.server.db, character.id)
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
    relations: { owner: true },
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner?.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  const dashboard = await resolveCharacterDashboard(request.server.db, character.id)
  upsertPanelAtSlot(
    dashboard,
    position,
    component,
    sanitizeSettings(component, settings)
  )
  await saveCharacterDashboard(
    request.server.db.getRepository(CharacterDashboard),
    dashboard
  )

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

  const dashboard = await resolveCharacterDashboard(request.server.db, character.id)
  upsertCustomHtmlPanel(dashboard, html)
  await saveCharacterDashboard(
    request.server.db.getRepository(CharacterDashboard),
    dashboard
  )

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

  const dashboard = await resolveCharacterDashboard(request.server.db, character.id)
  dashboard.panels = []
  await saveCharacterDashboard(
    request.server.db.getRepository(CharacterDashboard),
    dashboard
  )

  return reply.send(dashboard)
}
