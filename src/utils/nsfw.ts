import type { FastifyRequest } from "fastify"
import type Character from "../models/Character"
import type RefSheet from "../models/RefSheet"
import type RefSheetVariant from "../models/RefSheetVarients"

export function isAuthenticated(request: FastifyRequest): boolean {
  const user = request.user as { profileId?: string } | undefined
  return Boolean(user?.profileId)
}

export function shouldFilterNsfw(request: FastifyRequest): boolean {
  return !isAuthenticated(request)
}

export function filterArtworksForViewer<T extends { nsfw?: boolean | null }>(
  artworks: T[],
  request: FastifyRequest
): T[] {
  if (!shouldFilterNsfw(request)) return artworks
  return artworks.filter((artwork) => !artwork.nsfw)
}

export function filterRefSheetVariantsForViewer(
  variants: RefSheetVariant[],
  request: FastifyRequest
): RefSheetVariant[] {
  if (!shouldFilterNsfw(request)) return variants
  return variants.filter((variant) => !variant.nsfw)
}

export function filterRefSheetsForViewer(
  refSheets: RefSheet[],
  request: FastifyRequest
): RefSheet[] {
  if (!shouldFilterNsfw(request)) return refSheets
  return refSheets.map((sheet) => ({
    ...sheet,
    variants: filterRefSheetVariantsForViewer(sheet.variants ?? [], request),
  }))
}

export function sanitizeCharacterForViewer(
  character: Character,
  request: FastifyRequest
): Character {
  if (!shouldFilterNsfw(request)) return character
  return {
    ...character,
    refSheets: character.refSheets
      ? filterRefSheetsForViewer(character.refSheets, request)
      : character.refSheets,
  }
}

export function sanitizeCharactersForViewer(
  characters: Character[],
  request: FastifyRequest
): Character[] {
  return characters.map((character) => sanitizeCharacterForViewer(character, request))
}
