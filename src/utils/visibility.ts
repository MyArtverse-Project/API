import type { DataSource } from "typeorm"
import type { FastifyReply, FastifyRequest } from "fastify"
import type Character from "../models/Character"
import type Artwork from "../models/Artwork"
import Relationships from "../models/Relationships"
import {
  filterArtworksForViewer as filterArtworksForNsfw,
  filterRefSheetsForViewer,
  shouldFilterNsfw,
} from "./nsfw"

export type VisibilityValue =
  | "public"
  | "private"
  | "followers"
  | "unlisted"

export function normalizeVisibility(
  visibility: string | null | undefined
): VisibilityValue {
  if (!visibility) return "public"
  const value = visibility.toLowerCase()
  if (
    value === "public" ||
    value === "private" ||
    value === "followers" ||
    value === "unlisted"
  ) {
    return value
  }
  return "public"
}

export function getViewerProfileId(
  request: FastifyRequest
): string | undefined {
  const user = request.user as { profileId?: string } | undefined
  return user?.profileId
}

export function isOwnerProfile(
  viewerProfileId: string | undefined,
  ownerProfileId: string | undefined
): boolean {
  return Boolean(
    viewerProfileId && ownerProfileId && viewerProfileId === ownerProfileId
  )
}

export type VisibilityContext = {
  viewerProfileId?: string
  mutualFollowOwnerIds: Set<string>
}

export async function loadMutualFollowOwnerIds(
  db: DataSource,
  viewerProfileId: string
): Promise<Set<string>> {
  const repo = db.getRepository(Relationships)
  const [following, followers] = await Promise.all([
    repo.find({
      where: { follower: { id: viewerProfileId } },
      relations: { following: true },
    }),
    repo.find({
      where: { following: { id: viewerProfileId } },
      relations: { follower: true },
    }),
  ])

  const followingIds = new Set(
    following.map((rel) => rel.following?.id).filter(Boolean) as string[]
  )
  const followerIds = new Set(
    followers.map((rel) => rel.follower?.id).filter(Boolean) as string[]
  )

  const mutual = new Set<string>()
  for (const id of followingIds) {
    if (followerIds.has(id)) mutual.add(id)
  }
  return mutual
}

export async function buildVisibilityContext(
  db: DataSource,
  request: FastifyRequest
): Promise<VisibilityContext> {
  const viewerProfileId = getViewerProfileId(request)
  if (!viewerProfileId) {
    return { viewerProfileId, mutualFollowOwnerIds: new Set() }
  }

  const mutualFollowOwnerIds = await loadMutualFollowOwnerIds(
    db,
    viewerProfileId
  )
  return { viewerProfileId, mutualFollowOwnerIds }
}

export async function isMutualFollow(
  db: DataSource,
  viewerProfileId: string | undefined,
  ownerProfileId: string | undefined
): Promise<boolean> {
  if (!viewerProfileId || !ownerProfileId) return false
  if (viewerProfileId === ownerProfileId) return false

  const repo = db.getRepository(Relationships)
  const [viewerFollowsOwner, ownerFollowsViewer] = await Promise.all([
    repo.exists({
      where: {
        follower: { id: viewerProfileId },
        following: { id: ownerProfileId },
      },
    }),
    repo.exists({
      where: {
        follower: { id: ownerProfileId },
        following: { id: viewerProfileId },
      },
    }),
  ])

  return viewerFollowsOwner && ownerFollowsViewer
}

export function canViewByVisibility(
  visibility: string | null | undefined,
  options: {
    isOwner: boolean
    isMutual: boolean
    forList?: boolean
    hasListOwner?: boolean
  }
): boolean {
  if (options.isOwner) return true

  const level = normalizeVisibility(visibility)

  if (options.forList) {
    if (!options.hasListOwner) {
      return level === "public"
    }
    if (level === "public") return true
    if (level === "followers") return options.isMutual
    return false
  }

  if (level === "public" || level === "unlisted") return true
  if (level === "followers") return options.isMutual
  return false
}

function getEntityAccessFlags(
  entity: { owner?: { id?: string } },
  ctx: VisibilityContext,
  listOwnerProfileId?: string
) {
  const ownerId = entity.owner?.id ?? listOwnerProfileId
  const isOwner =
    isOwnerProfile(ctx.viewerProfileId, ownerId) ||
    isOwnerProfile(ctx.viewerProfileId, listOwnerProfileId)
  const isMutual = ownerId ? ctx.mutualFollowOwnerIds.has(ownerId) : false

  return {
    isOwner,
    isMutual,
    hasListOwner: Boolean(listOwnerProfileId),
  }
}

export function viewerCanViewEntityWithContext(
  entity: { visibility?: string | null; owner?: { id?: string } },
  ctx: VisibilityContext,
  listOwnerProfileId?: string,
  forList = false
): boolean {
  const flags = getEntityAccessFlags(entity, ctx, listOwnerProfileId)
  return canViewByVisibility(entity.visibility, { ...flags, forList })
}

export async function viewerCanViewEntity(
  entity: { visibility?: string | null; owner?: { id?: string } },
  request: FastifyRequest,
  db: DataSource
): Promise<boolean> {
  const ctx = await buildVisibilityContext(db, request)
  return viewerCanViewEntityWithContext(entity, ctx)
}

export async function viewerCanViewCharacter(
  character: { visibility?: string | null; owner?: { id?: string } },
  request: FastifyRequest,
  db: DataSource
): Promise<boolean> {
  return viewerCanViewEntity(character, request, db)
}

export async function denyIfCharacterNotViewable(
  character: { visibility?: string | null; owner?: { id?: string } },
  request: FastifyRequest,
  reply: FastifyReply,
  db: DataSource
): Promise<boolean> {
  if (await viewerCanViewCharacter(character, request, db)) return false
  reply.code(404).send({ error: "Character not found." })
  return true
}

export async function denyIfArtworkNotViewable(
  artwork: { visibility?: string | null; owner?: { id?: string } },
  request: FastifyRequest,
  reply: FastifyReply,
  db: DataSource
): Promise<boolean> {
  if (await viewerCanViewEntity(artwork, request, db)) return false
  reply.code(404).send({ error: "Artwork not found" })
  return true
}

export async function filterCharactersByVisibility(
  characters: Character[],
  request: FastifyRequest,
  db: DataSource,
  listOwnerProfileId?: string
): Promise<Character[]> {
  const ctx = await buildVisibilityContext(db, request)
  const isListOwner = isOwnerProfile(ctx.viewerProfileId, listOwnerProfileId)
  if (isListOwner) return characters

  return characters.filter((character) =>
    viewerCanViewEntityWithContext(character, ctx, listOwnerProfileId, true)
  )
}

export async function filterArtworksByVisibility<T extends Artwork>(
  artworks: T[],
  request: FastifyRequest,
  db: DataSource,
  listOwnerProfileId?: string
): Promise<T[]> {
  const ctx = await buildVisibilityContext(db, request)
  const isListOwner = isOwnerProfile(ctx.viewerProfileId, listOwnerProfileId)
  if (isListOwner) return artworks

  return artworks.filter((artwork) =>
    viewerCanViewEntityWithContext(artwork, ctx, listOwnerProfileId, true)
  )
}

export async function filterArtworksForViewer<T extends Artwork>(
  artworks: T[],
  request: FastifyRequest,
  db: DataSource,
  listOwnerProfileId?: string
): Promise<T[]> {
  return filterArtworksByVisibility(
    filterArtworksForNsfw(artworks, request),
    request,
    db,
    listOwnerProfileId
  )
}

export {
  filterRefSheetVariantsForViewer,
  filterRefSheetsForViewer,
} from "./nsfw"

export function sanitizeCharacterForViewer(
  character: Character,
  request: FastifyRequest
): Character {
  let result = character
  if (shouldFilterNsfw(request)) {
    result = {
      ...character,
      refSheets: character.refSheets
        ? filterRefSheetsForViewer(character.refSheets, request)
        : character.refSheets,
    }
  }
  return result
}

export async function sanitizeCharactersForViewer(
  characters: Character[],
  request: FastifyRequest,
  db: DataSource,
  listOwnerProfileId?: string
): Promise<Character[]> {
  const filtered = await filterCharactersByVisibility(
    characters,
    request,
    db,
    listOwnerProfileId
  )
  return filtered.map((character) =>
    sanitizeCharacterForViewer(character, request)
  )
}
