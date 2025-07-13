import { FastifyReply, FastifyRequest } from "fastify"
import Dashboard from "../../../models/Dashboard"
import { Character, User } from "../../../models"
import CharacterDashboard from "../../../models/CharacterDashboard"

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
      panels: []
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
  console.log("customHTMLPanel", customHTMLPanel)

  if (customHTMLPanel) {
    customHTMLPanel.settings.html = html
  } else {
    dashboard.panels.push({
      id: `panel-${Date.now()}`,
      type: "customHTML",
      position: { row: 1, col: 1 },
      settings: { html }
    })
  }

  await request.server.db.getRepository(Dashboard).save(dashboard)
  return reply.send(dashboard)
}

export const setPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { position, component } = request.body as {
    position: { row: number; col: number }
    component: string
  }

  if (!position || !component) {
    return reply.code(400).send({ error: "Position and component are required" })
  }

  if (!["comments", "information"].includes(component)) {
    return reply.code(400).send({ error: "Invalid component type" })
  }

  const dashboard = await request.server.db
    .getRepository(Dashboard)
    .findOne({ where: { user: { id: profileId } } })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  // Find panel at the given position
  const panelIndex = dashboard.panels.findIndex((p) => p.position.row === position.row && p.position.col === position.col)

  if (panelIndex !== -1) {
    // Replace existing panel
    dashboard.panels[panelIndex] = {
      id: `panel-${Date.now()}`,
      type: component,
      position,
      settings: {}
    }
  } else {
    // Add new panel
    dashboard.panels.push({
      id: `panel-${Date.now()}`,
      type: component,
      position,
      settings: {}
    })
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
    relations: ["owner"]
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })

  let dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { slug: characterName } }
  })

  if (!dashboard) {
    dashboard = await request.server.db.getRepository(CharacterDashboard).save({
      character,
      panels: []
    })
  }

  return reply.send(dashboard.panels)
}

export const setCharacterPanel = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { characterName } = request.params as { characterName: string }
  const { position, component } = request.body as {
    position: { row: number; col: number }
    component: string
  }

  if (!characterName || !position || !component) {
    return reply.code(400).send({ error: "Character name, position, and component are required" })
  }

  if (!["comments", "information", "featured_gallery", "featured_artwork"].includes(component)) {
    return reply.code(400).send({ error: "Invalid component type" })
  }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: characterName, owner: { id: profileId } },
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  let dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { slug: characterName } }
  })

  if (!dashboard) {
    dashboard = await request.server.db.getRepository(CharacterDashboard).save({
      character,
      panels: []
    })
  }

  const panelIndex = dashboard.panels.findIndex((p) =>
    p.position.row === position.row && p.position.col === position.col
  )

  console.log(position)

  const newPanel = {
    id: `panel-${Date.now()}`,
    type: component,
    position,
    settings: {}
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
  const { html, characterId } = request.body as { html: string; characterId: string }

  if (!html || !characterId) {
    return reply.code(400).send({ error: "HTML content and Character ID are required" })
  }

  const dashboard = await request.server.db
    .getRepository(CharacterDashboard)
    .findOne({ where: { character: { id: characterId } } })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  const customHTMLPanel = dashboard.panels.find((p) => p.type === "customHTML")
  console.log("customHTMLPanel", customHTMLPanel)

  if (customHTMLPanel) {
    customHTMLPanel.settings.html = html
  } else {
    dashboard.panels.push({
      id: `panel-${Date.now()}`,
      type: "customHTML",
      position: { row: 1, col: 1 },
      settings: { html }
    })
  }

  await request.server.db.getRepository(CharacterDashboard).save(dashboard)
  return reply.send(dashboard)
}


export const resetCharacterPanels = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { id: string; profileId: string }
  const { characterId } = request.body as { characterId: string }

  if (!characterId) return reply.code(400).send({ error: "Character ID is required" })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId },
    relations: ["owner"]
  })

  if (!character) return reply.code(404).send({ error: "Character not found" })
  if (character.owner.id !== profileId)
    return reply.code(403).send({ error: "You're not the owner of this character" })

  const dashboard = await request.server.db.getRepository(CharacterDashboard).findOne({
    where: { character: { id: characterId } }
  })

  if (!dashboard) {
    return reply.code(404).send({ error: "Dashboard not found" })
  }

  dashboard.panels = []
  await request.server.db.getRepository(CharacterDashboard).save(dashboard)
  return reply.send(dashboard)
}
