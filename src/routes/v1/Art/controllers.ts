import type { FastifyReply, FastifyRequest } from "fastify"
import { IsNull } from "typeorm"
import { Character, Commission, Image, User } from "../../../models"
import Artwork from "../../../models/Artwork"
import Comment from "../../../models/Comments"
import Notification from "../../../models/Notifications"
import Folder from "../../../models/Folder"
import { sendNotification } from "../../../utils/notification"
import { attachCommentReplies } from "../../../utils/comments"
import { shouldFilterNsfw } from "../../../utils/nsfw"
import {
  denyIfArtworkNotViewable,
  denyIfCharacterNotViewable,
  filterArtworksForViewer,
} from "../../../utils/visibility"

export const uploadArt = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
  const { characterId } = request.params as { characterId: string }
  const { title, description, imageUrl, userAsArtist, tags, nsfw, visibility } =
    request.body as {
      title: string
      description: string
      imageUrl: string
      userAsArtist: boolean
      tags: string[]
      nsfw?: boolean
      visibility?: string
    }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId },
    relations: { owner: true },
  })

  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  if (character.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
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

  if (!image.url.includes(`/${profileId}/`)) {
    return reply.code(403).send({ error: "Forbidden" })
  }

  const artwork = await request.server.db.getRepository(Artwork).save({
    title: title,
    description: description,
    artist: userAsArtist ? user : null,
    tags: tags,
    nsfw: nsfw ?? false,
    visibility: visibility ?? "public",
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
        publishedCharacter: true,
        folder: true,
      },
    },
    where: { slug: characterName, owner: { handle: ownerHandle } }
  })

  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  if (
    await denyIfCharacterNotViewable(
      character,
      request,
      reply,
      request.server.db
    )
  ) {
    return
  }

  return reply
    .code(200)
    .send(
      await filterArtworksForViewer(
        character.artworks ?? [],
        request,
        request.server.db,
        character.owner?.id
      )
    )
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

  if (
    await denyIfArtworkNotViewable(artwork, request, reply, request.server.db)
  ) {
    return
  }

  if (artwork.nsfw && shouldFilterNsfw(request)) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  const comments = await request.server.db.getRepository(Comment).find({
    relations: {
      artwork: true,
      author: true,
    },
    where: {
      artwork: { id: artworkId },
      parentComment: IsNull(),
    },
    order: { createdAt: "DESC" },
  })

  await attachCommentReplies(comments, request.server.db)

  artwork.views += 1
  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ ...artwork, comments })
}

export const commentArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { artworkId } = request.params as { artworkId: string }
  const { content, parentCommentId } = request.body as {
    content: string
    parentCommentId?: string
  }

  if (!content?.trim()) {
    return reply.code(400).send({ error: "No content provided" })
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: {
      owner: true,
      artist: true,
      comments: true,
    },
  })

  const author = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
  })

  if (!artwork || !author) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  if (parentCommentId) {
    const parentComment = await request.server.db.getRepository(Comment).findOne({
      where: {
        id: parentCommentId,
        artwork: { id: artworkId },
      },
    })

    if (!parentComment) {
      return reply.code(404).send({ error: "Parent comment not found" })
    }
  }

  const comment = await request.server.db.getRepository(Comment).save({
    artwork,
    author,
    content: content.trim(),
    parentComment: parentCommentId ? { id: parentCommentId } : undefined,
  })

  if (!comment) {
    return reply.code(500).send({ error: "Error adding comment" })
  }

  await sendNotification(
    request.server.db,
    author,
    `%user% commented on your artwork`,
    artwork.owner,
    artwork,
    comment
  )

  return reply.code(200).send({ message: "Comment added" })
}

// TODO: Only call this if user agreed to be featured or user is mutuals
export const featureCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
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
      charactersFeatured: true,
      owner: true,
    },
  })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId }
  })

  if (!artwork || !character) {
    return reply.code(404).send({ error: "Artwork or character not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
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
  const { profileId } = request.user as { profileId: string }
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
      charactersFeatured: true,
      owner: true,
    },
  })

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: characterId }
  })

  if (!artwork || !character) {
    return reply.code(404).send({ error: "Artwork or character not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
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
  const { profileId } = request.user as { profileId: string }
  const { artworkId } = request.params as { artworkId: string }
  const { title, description, tags, nsfw, imageUrl, visibility } = request.body as {
    title?: string
    description?: string
    tags?: string[]
    nsfw?: boolean
    imageUrl?: string
    visibility?: string
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: { owner: true },
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
  }

  if (title !== undefined) artwork.title = title
  if (description !== undefined) artwork.description = description
  if (tags !== undefined) artwork.tags = tags
  if (nsfw !== undefined) artwork.nsfw = nsfw
  if (visibility !== undefined) artwork.visibility = visibility

  if (imageUrl) {
    const image = await request.server.db.getRepository(Image).findOne({
      where: { url: imageUrl },
    })

    if (image) {
      artwork.artworkUrl = image.url
    }
  }

  await request.server.db.getRepository(Artwork).save(artwork)

  return reply.code(200).send({ message: "Artwork updated" })
}

export const assignArtworkToFolder = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { profileId } = request.user as { profileId: string }
  const { artworkId, folderId } = request.params as {
    artworkId: string
    folderId: string
  }

  const artworkRepo = request.server.db.getRepository(Artwork)
  const folderRepo = request.server.db.getRepository(Folder)

  const artwork = await artworkRepo.findOne({
    where: { id: artworkId },
    relations: {
      owner: true,
      publishedCharacter: true,
      charactersFeatured: true,
    },
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
  }

  const characterId =
    artwork.publishedCharacter?.id ?? artwork.charactersFeatured?.[0]?.id

  if (!characterId) {
    return reply.code(400).send({ error: "Artwork is not linked to a character" })
  }

  if (folderId === "root") {
    artwork.folder = null
    await artworkRepo.save(artwork)
    return reply.code(200).send({ message: "Artwork removed from folder" })
  }

  const folder = await folderRepo.findOne({
    where: { id: folderId },
    relations: { character: true, owner: true },
  })

  if (!folder) {
    return reply.code(404).send({ error: "Folder not found" })
  }

  if (folder.contentType !== "art" || !folder.character || folder.character.id !== characterId) {
    return reply.code(400).send({ error: "Folder does not belong to this character gallery" })
  }

  if (folder.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
  }

  artwork.folder = folder
  await artworkRepo.save(artwork)

  return reply.code(200).send({ message: "Artwork folder updated" })
}

export const deleteArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
  const { artworkId } = request.params as { artworkId: string }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: { owner: true },
  })

  if (!artwork) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
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
  const { profileId } = request.user as { profileId: string }
  const { artworkId, artistId } = request.params as {
    artworkId: string
    artistId: string
  }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: { owner: true },
  })

  const artist = await request.server.db.getRepository(User).findOne({
    where: { id: artistId }
  })

  if (!artwork || !artist) {
    return reply.code(404).send({ error: "Artwork or artist not found" })
  }

  if (artwork.owner?.id !== profileId) {
    return reply.code(403).send({ error: "Forbidden" })
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

export const getSelfArtworks = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
  const artworks = await request.server.db.getRepository(Artwork).find({
    where: [
      { artist: { id: profileId } },
      { owner: { id: profileId } }
    ],
    relations: {
      owner: true,
      artist: true,
      charactersFeatured: true,
      comments: true,
      publishedCharacter: true
    },
  })
  return reply.code(200).send(artworks)
}

export const favoriteArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { artworkId } = request.params as { artworkId: string }

  const artwork = await request.server.db.getRepository(Artwork).findOne({
    where: { id: artworkId },
    relations: {
      favoritedBy: true,
      owner: true,
    },
  })

  const profile = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
  })

  if (!artwork || !profile) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  if (
    await denyIfArtworkNotViewable(artwork, request, reply, request.server.db)
  ) {
    return
  }

  if (artwork.nsfw && shouldFilterNsfw(request)) {
    return reply.code(404).send({ error: "Artwork not found" })
  }

  const isFavorited =
    artwork.favoritedBy?.some((favoritingUser) => favoritingUser.id === profile.id) ??
    false

  try {
    const relation = request.server.db
      .createQueryBuilder()
      .relation(Artwork, "favoritedBy")
      .of(artwork.id)

    if (isFavorited) {
      await relation.remove(profile.id)
      return reply.code(200).send({ message: "Artwork unfavorited" })
    }

    await relation.add(profile.id)
    return reply.code(200).send({ message: "Artwork favorited" })
  } catch (error) {
    request.log.error(error)
    return reply.code(500).send({ error: "Failed to update favorite" })
  }
}

