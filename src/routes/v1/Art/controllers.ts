import type { FastifyReply, FastifyRequest } from "fastify"
import { Character, Image, User } from "../../../models"
import { Artwork } from "../../../models/Artwork"

export const uploadArt = async (request: FastifyRequest, reply: FastifyReply) => {
    const { profileId } = request.user as { profileId: string }
    const { characterId } = request.params as { characterId: string }
    const { title, description, imageUrl, userAsArtist, tags } = request.body as {
        title: string
        description: string
        imageUrl: string
        userAsArtist: boolean
        tags: string[]
    }

    const character = await request.server.db.getRepository(Character).findOne({
        where: { id: characterId }
    })

    if (!character) {
        return reply.code(404).send({ error: "Character not found" })
    }

    const user = await request.server.db.getRepository(User).findOne({
        where: { id: profileId }
    })

    if (!user) {
        return reply.code(404).send({ error: "User not found" })
    }

    const image = await request.server.db.getRepository(Image).findOne({
        where: { url: imageUrl }
    })

    if (!image) {
        return reply.code(404).send({ error: "Image not found" })
    }



    const artwork = await request.server.db.getRepository(Artwork).save({
        title,
        description,
        artist: userAsArtist ? user : null,
        tags
    })

    if (!artwork) {
        return reply.code(500).send({ error: "Error uploading artwork" })
    }

    character.artworks.push(artwork)
    await request.server.db.getRepository(Character).save(character)

    return reply.code(200).send({ message: "Artwork uploaded", id: artwork.id })
}