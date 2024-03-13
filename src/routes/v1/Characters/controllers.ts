import type { FastifyReply, FastifyRequest } from "fastify"
import { Attributes, Character, User } from "../../../models"
import { uploadToS3 } from "../../../utils"
import { Artwork } from "../../../models/Artwork"

interface GetCharacterParams {
  id?: string
  name?: string
  ownerHandle?: string
}

interface CreateCharacterBody {
  name: string
  visible: boolean
  nickname: string
  mainCharacter: boolean
  species: string
  pronouns: string
  gender: string
  bio: string
  likes: string[]
  dislikes: string[]
  is_hybrid: boolean
}

export const getCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      characters: true
    }
  })
  if (!data) return reply.status(404).send("No user found.")

  return reply.code(200).send({ characters: data.characters })
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
    visible,
    nickname,
    mainCharacter,
    species,
    pronouns,
    gender,
    bio,
    likes,
    dislikes,
    is_hybrid
  } = request.body as CreateCharacterBody

  const user = request.user as { id: string; profileId: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!data) return reply.status(404).send("No user found.")

  const attributes = await request.server.db.getRepository(Attributes).save({
    bio: bio,
    pronouns: pronouns,
    gender: gender,
    preferences: { likes, dislikes },
    custom_fields: []
  })

  const newCharacter = await request.server.db.getRepository(Character).save({
    name: name,
    visible: visible,
    nickname: nickname,
    species: species,
    is_hybrid: is_hybrid,
    attributes: attributes,
    owner: data
  })

  if (mainCharacter) {
    data.mainCharacter = null
    await request.server.db.getRepository(User).save(data)
    data.mainCharacter = newCharacter
    await request.server.db.getRepository(User).save(data)
  }

  if (!data.characters) data.characters = []
  data.characters.push(newCharacter)
  await request.server.db.getRepository(User).save(data)

  return reply.code(200).send({ character: newCharacter })
}

export const uploadArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string, profileId: string }
  const data = await request.file()
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded" })
  }
  
  const { file, filename, mimetype } = data;
  const uploadResult = await uploadToS3(
    request.server.s3,
    file,
    filename,
    mimetype,
    "user",
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

export const deleteCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Character deleted" })
}
