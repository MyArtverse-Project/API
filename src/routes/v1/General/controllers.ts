import { FastifyReply, FastifyRequest } from "fastify"
import { Artwork, Character, User } from "../../../models"
import { filterArtworksForViewer, filterCharactersByVisibility } from "../../../utils/visibility"

export const search = async (request: FastifyRequest, reply: FastifyReply) => {
    const { query, type } = request.query as { query?: string; type?: string }
    const { profileId } = request.user as { id: string; profileId?: string }

    if (!query) {
        return reply.status(400).send({ error: "Search query is required" })
    }

    const repoMap = {
        artwork: { entity: Artwork, fields: ["title"] },
        user: { entity: User, fields: ["displayName", "handle"] },
        character: { entity: Character, fields: ["name"] },
    }

    const searchTypes = type && type in repoMap ? [type] : Object.keys(repoMap)

    const results = await Promise.all(
        searchTypes.map(async (key) => {
            const { entity, fields } = repoMap[key as keyof typeof repoMap]
            const repo = request.server.db.getRepository(entity)

            let queryBuilder = repo.createQueryBuilder(key)

            if (key === "artwork" || key === "character") {
                queryBuilder = queryBuilder.leftJoinAndSelect(`${key}.owner`, "owner")
            }

            fields.forEach((field, index) => {
                if (index === 0) {
                    queryBuilder.where(`${key}.${field} ILIKE :query`, { query: `%${query}%` })
                } else {
                    queryBuilder.orWhere(`${key}.${field} ILIKE :query`, { query: `%${query}%` })
                }
            })

            return queryBuilder
                .getMany()
                .then((res) => ({ type: key, results: res }))
        })
    )

    if (profileId) {
        const user = await request.server.db.getRepository(User).findOne({ where: { id: profileId } })
        if (!user) {
            return reply.status(404).send({ error: "User not found" })
        }
        const recentSearches = new Set([query, ...(user.recentSearches || []).slice(0, 4)])
        user.recentSearches = [...recentSearches]
        await request.server.db.getRepository(User).save(user)
    }

    const acc: Record<string, unknown[]> = {}
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
            acc.character = await filterCharactersByVisibility(
                res.results as unknown as Character[],
                request,
                request.server.db
            )
            continue
        }

        acc[res.type] = res.results
    }

    return acc
}
