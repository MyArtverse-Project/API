import type { FastifyReply, FastifyRequest } from "fastify"
import { Attributes, Character, User } from "../../../models"
import { Artwork } from "../../../models/Artwork"
import { Comment } from "../../../models/Comments"
import { uploadToS3 } from "../../../utils"
import type { RefSheet as RefSheetType, GetCharacterParams, CreateCharacterBody, EditCharacterBody } from "../../../types/CharacterTypes"
import { RefSheetVariant } from "../../../models/RefSheetVarients"
import { RefSheet } from "../../../models/RefSheet"



export const getCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const character = await request.server.db.getRepository(Character).find({
    where: { owner: { id: user.profileId } },
    relations: {
      attributes: true,
      refSheets: true,
    }
  })

  if (!character) return reply.status(404).send("No characters found.")

  return reply.code(200).send(character)
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

export const getCharacterWithOwner = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { name } = request.params as GetCharacterParams
  const { profileId } = request.user as { profileId: string }
  if (!name) {
    return reply.code(400).send({
      error: "You must provide a name of your character."
    })
  }

  try {
    const data = await request.server.db.getRepository(Character).findOne({
      where: { owner: { id: profileId }, name: name },
      relations: {
        owner: true,
        attributes: true,
        mainOwner: true
      }
    })

    const attributes = await request.server.db.getRepository(Attributes).findOne({
      where: { character: { name: name } }
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    const finalData = { ...data, attributes } as Record<string, unknown>
    // Remove owner data
    finalData["mainCharacter"] = data.mainOwner ? true : false
    delete finalData.mainOwner

    return reply.code(200).send(finalData)
  } catch (error) {
    return reply.code(500).send({ error: "Internal server" })
  }
}

export const createCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const { name, nickname, visiblility, mainCharacter, characterAvatar } =
    request.body as CreateCharacterBody

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

  await request.server.db.getRepository(Attributes).save({
    character: newCharacter
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

export const updateCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { id } = request.params as { id: string }
  const body = request.body as EditCharacterBody
  const data = await request.server.db.getRepository(Character).findOne({
    where: { id: id, owner: { id: user.profileId } },
    relations: {
      attributes: true
    }
  })

  if (!data) return reply.status(404).send("No character found.")

  const finalData = {
    ...data,
    ...body
  }

  const result = await request.server.db.getRepository(Character).save(finalData)
  if (!result) return reply.status(500).send("Error updating character.")

  return reply.code(200).send({ message: "Character updated." })
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

export const uploadRefSheet = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const body = request.body as { refSheet: RefSheetType, characterId: string }
  const data = await request.server.db.getRepository(Character).findOne({
    where: { id: body.characterId, owner: { id: user.profileId } }
  })

  if (!data) return reply.status(404).send("No character found.")

    const refSheet = await request.server.db.getRepository(RefSheet).save({
    refSheetName: body.refSheet.refSheetName,
    colors: body.refSheet.colors,
    character: data,
    active: true
  })

  for (const variant of body.refSheet.variants) {
    await request.server.db.getRepository(RefSheetVariant).save({
      name: variant.name,
      url: variant.url,
      active: variant.active,
      nsfw: variant.nsfw,
      refSheet: refSheet
    })
  }

  const finalRefSheet = await request.server.db.getRepository(RefSheet).findOne({
    where: { id: refSheet.id },
    relations: {
      variants: true
    }
  })

  return reply.code(200).send({ message: "Ref sheet uploaded", refSheet: finalRefSheet })


}

export const setArtAsRefSheet = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Ref sheet set" })
}

export const getFeaturedCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = await request.server.db.getRepository(Character).find({
    where: {  },
    relations: {
      owner: true,
      attributes: true
    }
  })

  if (!data) return reply.status(404).send("No featured characters found.")

  return reply.code(200).send(data)
}

// // WIP
// export const deleteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
//   const user = request.user as { id: string; profileId: string }
//   const { safename } = request.params as { safename: string }

//   // TODO: Delete Images associated with character under the Owner
//   // TODO: Delete Ref Sheets associated with character under the Owner
//   // TODO: Delete Comments associated with character
//   // TODO:

//   const data = await request.server.db.getRepository(Character).findOne({
//     where: { safename: safename, owner: { id: user.profileId } }
//   })

//   if (!data) return reply.status(404).send("No character found.")
//   const result = await request.server.db.getRepository(Character).delete(data)
//   if (result.affected == 0) return reply.status(500).send("Error deleting character.")

//   return reply.code(200).send({ message: "Character deleted." })
// }
