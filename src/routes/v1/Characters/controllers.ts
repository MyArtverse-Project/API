import type { FastifyReply, FastifyRequest } from "fastify"
import { Attributes, Character, User } from "../../../models"
import { uploadToS3 } from "../../../utils"
import { Artwork } from "../../../models/Artwork"
import { Comment } from "../../../models/Comments"
import { RefSheetVariant } from "../../../models/RefSheetVarients"
import { RefSheet } from "../../../models/RefSheet"

interface GetCharacterParams {
  id?: string
  name?: string
  ownerHandle?: string
}

interface CreateCharacterBody {
  name: string
  nickname: string
  visiblility: "public" | "private" | "followers"
  mainCharacter: boolean
  characterAvatar: string
}

interface RefSheet {
  refSheetName: string
  colors: string[]
  varient: {
    name: string
    url: string,
    main: boolean,
    nsfw: boolean
  }[]
}

export const getCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      characters: true,
      mainCharacter: true
    }
  })
  if (!data) return reply.status(404).send("No user found.")
  const finalCharacters = []
  for (const chars of data.characters) {
    if (chars.id == data.mainCharacter?.id) {
      // TODO: Better way to do this
      // @ts-expect-error : This is for the front-end
      chars["mainCharacter"] = true
      finalCharacters.push(chars)
      continue
    }
    
    finalCharacters.push(chars)
  }

  console.log(finalCharacters)

  return reply.code(200).send(finalCharacters)
}

export const getOwnersCharacters = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { ownerHandle } = request.params as { ownerHandle: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { handle: ownerHandle },
    relations: {
      characters: true,
      mainCharacter: true
    }
  })
  if (!data) return reply.status(404).send("No user found.")

  return reply
    .code(200)
    .send({ characters: data.characters, mainCharacter: data.mainCharacter ?? null })
}

export const getCharacterById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as GetCharacterParams

  if (!id) {
    return reply.code(400).send({ error: "You must provide an ID of the character." })
  }

  try {
    const data = await request.server.db.getRepository(Character).findOne({
      where: { id }
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    return reply.code(200).send({ ...data })
  } catch (error) {
    return reply.code(500).send({ error: "Internal server error." })
  }
}

export const getCharacterByName = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { name, ownerHandle } = request.params as GetCharacterParams
  if (!name || !ownerHandle) {
    return reply.code(400).send({
      error: "You must provide a name with the owner's handle of the character."
    })
  }

  try {
    const data = await request.server.db.getRepository(Character).findOne({
      where: { owner: { handle: ownerHandle }, name: name },
      relations: {
        owner: true,
        attributes: true
      }
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    return reply.code(200).send({ ...data })
  } catch (error) {
    return reply.code(500).send({ error: "Internal server" })
  }
}

export const createCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const {
    name,
    nickname,
    visiblility,
    mainCharacter,
    characterAvatar
  } = request.body as CreateCharacterBody

  const user = request.user as { id: string; profileId: string }

  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!data) return reply.status(404).send("No user found.")
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-")

  const safeNameCheck = await request.server.db.getRepository(Character).findOne({
    where: { safename: safeName, owner: data }
  })

  if (safeNameCheck) {
    return reply.code(400).send({ error: "Character with that name already exists." })
  }

  const newCharacter = await request.server.db.getRepository(Character).save({
    name: name,
    safeName: safeName,
    visibility: visiblility,
    nickname: nickname,
    avatarUrl: characterAvatar,
    owner: data
  })

  if (mainCharacter) {
    data.mainCharacter = null
    await request.server.db.getRepository(User).save(data)
    data.mainCharacter = newCharacter
    await request.server.db.getRepository(User).save(data)
  }

  return reply.code(200).send({ character: newCharacter })
}

export const uploadArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.file()
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded" })
  }

  const { file, filename, mimetype } = data
  const uploadResult = await uploadToS3(
    request.server.s3,
    file,
    filename,
    mimetype,
    user.id
  )

  if (!uploadResult) {
    return reply.code(500).send({ message: "Error uploading file" })
  }

  const image = await request.server.db.getRepository(Artwork).save({
    url: uploadResult.url,
    altText: filename,
    type: "user",
    ownerId: user.id
  })

  return reply.code(200).send({ message: "Artwork uploaded", url: image.url })
}

export const commentCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { safeName, ownerHandle } = request.params as {
    safeName: string
    ownerHandle: string
  }

  const { content } = request.body as { content: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { safename: safeName, owner: { handle: ownerHandle } }
  })

  const author = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!character || !author) {
    return reply.code(404).send({ error: "Character not found" })
  }

  const comment = await request.server.db.getRepository(Comment).save({
    content: content,
    author: author,
    character: character
  })

  if (!comment) {
    return reply.code(500).send({ error: "Error commenting" })
  }

  return reply.code(200).send({ message: "Commented" })
}

export const getComments = async (request: FastifyRequest, reply: FastifyReply) => {
  const { ownerHandle, safeName } = request.params as {
    ownerHandle: string
    safeName: string
  }

  const comments = await request.server.db.getRepository(Comment).find({
    where: { character: { safename: safeName, owner: { handle: ownerHandle } } },
    relations: {
      author: true,
      character: true
    }
  })

  if (!comments) {
    return reply.code(404).send({ error: "No comments found" })
  }

  return reply.code(200).send(comments)
}

export const setArtAsAvatar = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Avatar set" })
}

export const uploadRefSheet = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Ref sheet uploaded" })
}

export const setArtAsRefSheet = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Ref sheet set" })
}

export const updateCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ character: {} })
}

// WIP
export const deleteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { safename } = request.params as { safename: string }

  // TODO: Delete Images associated with character under the Owner
  // TODO: Delete Ref Sheets associated with character under the Owner
  // TODO: Delete Comments associated with character
  // TODO:

  const data = await request.server.db.getRepository(Character).findOne({
    where: { safename: safename, owner: { id: user.profileId } }
  })

  if (!data) return reply.status(404).send("No character found.")
  const result = await request.server.db.getRepository(Character).delete(data)
  if (result.affected == 0) return reply.status(500).send("Error deleting character.")

  return reply.code(200).send({ message: "Character deleted." })
}
