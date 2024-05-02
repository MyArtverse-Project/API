import type { FastifyReply, FastifyRequest } from "fastify"
import { Character, Commission, Image, User } from "../../../models"
import Artwork from "../../../models/Artwork"
import { Comment } from "../../../models/Comments"
import { Notification } from "../../../models/Notifications"
import { sendNotification } from "../../../utils/notification"

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
    title: title,
    description: description,
    artist: userAsArtist ? user : null,
    tags: tags,
    owner: user,
    artworkUrl: image.url
  })

  if (!artwork) {
    return reply.code(500).send({ error: "Error uploading artwork" })
  }

  artwork.charactersFeatured = [character]
  artwork.publishedCharacter = character
  await request.server.db.getRepository(Artwork).save(artwork)

  // if (!character.artworks) {
  //     character.artworks = []
  // }

  // character.artworks.push(artwork)
  // await request.server.db.getRepository(Character).save(character)

  return reply.code(200).send({ message: "Artwork uploaded", id: artwork.id })
}

export const getCharacterArtwork = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { characterName, ownerHandle } = request.params as {
    characterName: string
    ownerHandle: string
  }

  const character = await request.server.db.getRepository(Character).findOne({
    relations: {
      owner: true,
      artworks: {
        owner: true,
        artist: true,
        charactersFeatured: true,
        comments: true,
        publishedCharacter: true

      },
    },
    where: { name: characterName, owner: { handle: ownerHandle } }
  })

  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  console.log(character.artworks)

  // const artwork = await request.server.db.getRepository(Artwork).find({
  //   relations: {
  //     owner: true,
  //     charactersFeatured: true,
  //     artist: true,
  //     comments: true
  //   },
  //   where: {
  //     charactersFeatured: { id: character.id },
  //     owner: {
  //       id: character.owner.id
  //     }
  //   }
  // })

  return reply.code(200).send(character.artworks)
}

export const getArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const { artworkId } = request.params as { artworkId: string }
  const artwork = await request.server.db.getRepository(Artwork).findOne({
    relations: {
      owner: true,
      charactersFeatured: true,
      artist: true
    },
    where: { id: artworkId }
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  const comments = await request.server.db.getRepository(Comment).find({
    relations: {
      artwork: true,
      author: true
    },
    where: { artwork: { id: artworkId } }
  })

  artwork.views += 1
  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ ...artwork, comments: comments })
}

export const commentArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { artworkId } = request.params as { artworkId: string }
  const { content } = request.body as { content: string }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: {
      owner: true,
      artist: true,
      comments: true
    }
  })

  const author = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!artwork || !author) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  const comment = await request.server.db.getRepository(Comment).save({
    artwork: artwork,
    author: author,
    content: content
  })

  if (!comment) {
    return reply.code(500).send({ error: "Error adding comment" })
  }

  await sendNotification(
    request.server.db,
    author,
    `${author.handle} commented on your artwork`,
    artwork.owner,
    artwork,
    comment
  )

  return reply.code(200).send({ message: "Comment added" })
}

// TODO: Only call this if user agreed to be featured or user is mutuals
export const featureCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const { artworkId, characterId } = request.params as {
    artworkId: string
    characterId: string
  }

  if (!artworkId || !characterId) {
    return reply.code(400).send({ error: "Missing artwork or character id" })
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: {
      charactersFeatured: true
    }
  })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId }
  })

  if (!artwork || !character) {
    return reply.code(404).send({ error: "Artwork or character not found" })
  }

  if (!artwork.charactersFeatured) {
    artwork.charactersFeatured = []
  }

  if (artwork.charactersFeatured.find((c) => c.id === character.id)) {
    return reply.code(400).send({ error: "Character already featured" })
  }

  artwork.charactersFeatured.push(character)
  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ message: "Character featured" })
}

export const unfeatureCharacter = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { artworkId, characterId } = request.params as {
    artworkId: string
    characterId: string
  }

  if (!artworkId || !characterId) {
    return reply.code(400).send({ error: "Missing artwork or character id" })
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: {
      charactersFeatured: true
    }
  })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId }
  })

  if (!artwork || !character) {
    return reply.code(404).send({ error: "Artwork or character not found" })
  }

  if (!artwork.charactersFeatured) {
    artwork.charactersFeatured = []
  }

  if (!artwork.charactersFeatured.find((c) => c.id === character.id)) {
    return reply.code(400).send({ error: "Character not featured" })
  }

  artwork.charactersFeatured = artwork.charactersFeatured.filter(
    (c) => c.id !== character.id
  )
  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ message: "Character unfeatured" })
}

export const updateArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const { artworkId } = request.params as { artworkId: string }
  const { title, description, tags } = request.body as {
    title: string
    description: string
    tags: string[]
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId }
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  artwork.title = title
  artwork.description = description
  artwork.tags = tags

  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ message: "Artwork updated" })
}

export const deleteArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const { artworkId } = request.params as { artworkId: string }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId }
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  artwork.charactersFeatured = []
  artwork.publishedCharacter = null
  await request.server.db.getRepository(Artwork).save(artwork)

  await request.server.db.getRepository(Notification).delete({
    artwork: artwork
  })

  await request.server.db.getRepository(Comment).delete({
    artwork: artwork
  })

  await request.server.db.getRepository(Artwork).delete({
    id: artworkId
  })

  return reply.code(200).send({ message: "Artwork deleted" })
}

export const assignArtist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { artworkId, artistId } = request.params as {
    artworkId: string
    artistId: string
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId }
  })

  const artist = await request.server.db.getRepository(User).findOne({
    where: { id: artistId }
  })

  if (!artwork || !artist) {
    return reply.code(404).send({ error: "Artwork or artist not found" })
  }

  artwork.artist = null
  await request.server.db.getRepository(Artwork).save(artwork)
  artwork.artist = artist
  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ message: "Artist assigned" })
}

export const createListing = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
  const { title, description, price, listingBannerUrl, examples } = request.body as {
    title: string
    description: string
    price: number
    listingBannerUrl: string
    examples: string[]
  }

  const user = await request.server.db.getRepository(User).findOne({
    where: { id: profileId }
  })

  if (!user) {
    return reply.code(404).send({ error: "User not found" })
  }


  const listing = await request.server.db.getRepository(Commission).save({
    title: title,
    description: description,
    price: price,
    listingBannerUrl: listingBannerUrl,
    examples: examples,
    user: user
  })

  if (!listing) {
    return reply.code(500).send({ error: "Error creating listing" })
  }

  return reply.code(200).send({ message: "Listing created", id: listing.id })
}

export const getListings = async (request: FastifyRequest, reply: FastifyReply) => {
  const listings = await request.server.db.getRepository(Commission).find({
    relations: {
      user: true
    }
  })

  return reply.code(200).send(listings)
}