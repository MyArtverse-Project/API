import { FastifyReply, FastifyRequest } from "fastify"
import { Artwork, Character, User } from "../../../models"
import {
  filterArtworksForViewer,
  sanitizeCharactersForViewer,
} from "../../../utils/visibility"

const SEARCH_LIMIT = 20

const TYPE_ALIASES: Record<string, "user" | "artwork" | "character"> = {
  user: "user",
  users: "user",
  artwork: "artwork",
  artworks: "artwork",
  character: "character",
  characters: "character",
}

export const search = async (request: FastifyRequest, reply: FastifyReply) => {
  const { query, type } = request.query as { query?: string; type?: string }
  const profileId = (request.user as { profileId?: string } | undefined)
    ?.profileId

  if (!query?.trim()) {
    return reply.status(400).send({ error: "Search query is required" })
  }

  const trimmedQuery = query.trim()
  const normalizedType = type ? TYPE_ALIASES[type.toLowerCase()] : undefined

  const repoMap = {
    artwork: { entity: Artwork, fields: ["title"] as const },
    user: { entity: User, fields: ["displayName", "handle"] as const },
    character: {
      entity: Character,
      fields: ["name", "slug", "nickname"] as const,
    },
  }

  const searchTypes =
    normalizedType && normalizedType in repoMap
      ? [normalizedType]
      : (Object.keys(repoMap) as Array<keyof typeof repoMap>)

  const results = await Promise.all(
    searchTypes.map(async (key) => {
      const { entity, fields } = repoMap[key]
      const repo = request.server.db.getRepository(entity)

      let queryBuilder = repo.createQueryBuilder(key)

      if (key === "artwork") {
        queryBuilder = queryBuilder
          .leftJoinAndSelect(`${key}.owner`, "owner")
          .leftJoinAndSelect(`${key}.publishedCharacter`, "publishedCharacter")
          .leftJoinAndSelect("publishedCharacter.owner", "pcOwner")
      } else if (key === "character") {
        queryBuilder = queryBuilder.leftJoinAndSelect(`${key}.owner`, "owner")
      }

      fields.forEach((field, index) => {
        if (index === 0) {
          queryBuilder.where(`${key}.${field} ILIKE :query`, {
            query: `%${trimmedQuery}%`,
          })
        } else {
          queryBuilder.orWhere(`${key}.${field} ILIKE :query`, {
            query: `%${trimmedQuery}%`,
          })
        }
      })

      if (key === "artwork") {
        queryBuilder.orWhere(`CAST(${key}.tags AS TEXT) ILIKE :query`, {
          query: `%${trimmedQuery}%`,
        })
      }

      return queryBuilder
        .take(SEARCH_LIMIT)
        .getMany()
        .then((res) => ({ type: key, results: res }))
    })
  )

  if (profileId) {
    const user = await request.server.db
      .getRepository(User)
      .findOne({ where: { id: profileId } })
    if (user) {
      const recentSearches = new Set([
        trimmedQuery,
        ...(user.recentSearches || []).slice(0, 4),
      ])
      user.recentSearches = [...recentSearches]
      await request.server.db.getRepository(User).save(user)
    }
  }

  const acc: {
    user?: User[]
    artwork?: Artwork[]
    character?: Character[]
  } = {}

  for (const res of results) {
    if (!res.results.length) continue

    if (res.type === "artwork") {
      acc.artwork = await filterArtworksForViewer(
        res.results as unknown as Artwork[],
        request,
        request.server.db
      )
      continue
    }

    if (res.type === "character") {
      acc.character = await sanitizeCharactersForViewer(
        res.results as unknown as Character[],
        request,
        request.server.db
      )
      continue
    }

    acc.user = res.results as User[]
  }

  return reply.send({
    user: acc.user ?? [],
    artwork: acc.artwork ?? [],
    character: acc.character ?? [],
  })
}
