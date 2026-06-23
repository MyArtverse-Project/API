import type { FastifyReply, FastifyRequest } from "fastify"
import { ILike, type EntityManager } from "typeorm"
import { Attributes, Character, Comment, RefSheet, RefSheetVariant, User } from "../../../models"
import Artwork from "../../../models/Artwork"
import CharacterDashboard from "../../../models/CharacterDashboard"
import Folder from "../../../models/Folder"

import type {
  CreateCharacterBody,
  EditCharacterBody,
  GetCharacterParams,
} from "../../../types/CharacterTypes"
import { uploadToS3 } from "../../../utils"
import {
  formatUploadLimit,
  loadUserUploadLimit,
  UploadLimitError,
} from "../../../utils/uploadLimits"
import {
  applyRefSheetArtistCredit,
  type ArtistCreditPayload,
} from "../../../utils/artistCredit"

const REF_SHEET_RELATIONS = {
  variants: true,
  artistUser: true,
} as const

export const getCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const character = await request.server.db.getRepository(Character).find({
    where: { owner: { id: user.profileId } },
    relations: {
      attributes: true,
      refSheets: REF_SHEET_RELATIONS,
    },
  })

  if (!character) return reply.status(404).send("No characters found.")

  return reply.code(200).send(character)
}

export const searchCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const { query } = request.query as { query: string }
  const characters = await request.server.db.getRepository(Character).find({
    where: { name: ILike(`%${query}%`) },
    relations: {
      attributes: true,
      refSheets: true
    },
    take: 10
  })

  if (!characters) return reply.status(404).send("No characters found.")

  return reply.code(200).send(characters)
}

export const getOwnersCharacters = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { ownerHandle } = request.params as { ownerHandle: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { handle: ownerHandle },
    relations: {
      characters: {
        folder: true,
        refSheets: {
          variants: true,
          artistUser: true,
        },
      },
    },
  })

  const mainCharacter = await request.server.db.getRepository(Character).findOne({
    where: { owner: { handle: ownerHandle }, mainOwner: true },
    relations: {
      refSheets: {
        variants: true,
      },
    },
  })

  if (mainCharacter) {
    data?.characters?.forEach((character) => {
      if (character.id === mainCharacter.id) {
        character.refSheets = mainCharacter.refSheets
      }
    })
  }

  if (!data) return reply.status(404).send("No user found.")

  return reply
    .code(200)
    .send({ characters: data.characters, mainCharacter: mainCharacter ?? null })
}

export const getCharacterById = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as GetCharacterParams

  if (!id) {
    return reply.code(400).send({ error: "You must provide an ID of the character." })
  }

  try {
    const data = await request.server.db.getRepository(Character).findOne({
      where: { id },
      relations: {
        owner: true,
        attributes: true,
        refSheets: REF_SHEET_RELATIONS,
      },
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    data.views += 1
    await request.server.db.getRepository(Character).save(data)

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
      where: { owner: { handle: ownerHandle }, slug: name },
      relations: {
        owner: true,
        attributes: true,
        favoritedBy: true,
        dashboards: true
      }
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    const comments = await request.server.db.getRepository(Comment).find({
      where: { character: { id: data.id } },
      relations: {
        character: true,
        author: true
      }
    })

    data.views += 1
    await request.server.db.getRepository(Character).save(data)

    return reply.code(200).send({ ...data, comments: comments })
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
      where: { owner: { id: profileId }, slug: name },
      relations: {
        owner: true,
        attributes: true,
        mainOwner: true,
        refSheets: REF_SHEET_RELATIONS,
      },
    })

    const attributes = await request.server.db.getRepository(Attributes).findOne({
      where: { character: { slug: name } }
    })

    if (!data) {
      return reply.code(404).send({ error: "Character not found." })
    }

    data.views += 1
    await request.server.db.getRepository(Character).save(data)

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
  const body = request.body as CreateCharacterBody
  const { name, nickname, mainCharacter, characterAvatar } = body
  const visibility = body.visibility ?? body.visiblility ?? "public"

  const user = request.user as { id: string; profileId: string }

  try {
    const owner = await request.server.db.getRepository(User).findOne({
      where: { id: user.profileId },
      relations: { mainCharacter: true },
    })

    if (!owner) return reply.status(404).send({ error: "No user found." })

    const trimmedName = name.trim()
    if (!trimmedName) {
      return reply.code(400).send({ error: "Character name is required." })
    }

    const safeName = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    if (!safeName) {
      return reply.code(400).send({ error: "Character name must include letters or numbers." })
    }

    const characterRepo = request.server.db.getRepository(Character)
    const attributesRepo = request.server.db.getRepository(Attributes)

    const safeNameCheck = await characterRepo.findOne({
      where: { safename: safeName, owner: { id: owner.id } },
    })

    if (safeNameCheck) {
      return reply.code(400).send({ error: "Character with that name already exists." })
    }

    const attributes = await attributesRepo.save(attributesRepo.create({}))

    const characterDraft = characterRepo.create({
      name: trimmedName,
      safename: safeName,
      slug: safeName,
      visibility,
      nickname: nickname?.trim() || undefined,
      avatarUrl: characterAvatar || undefined,
      attributes,
    })
    characterDraft.owner = owner

    const newCharacter = await characterRepo.save(characterDraft)

    if (mainCharacter) {
      owner.mainCharacter = newCharacter
      await request.server.db.getRepository(User).save(owner)
    }

    return reply.code(200).send({
      character: {
        id: newCharacter.id,
        name: newCharacter.name,
        slug: newCharacter.slug,
        safename: newCharacter.safename,
        visibility: newCharacter.visibility,
        nickname: newCharacter.nickname,
        avatarUrl: newCharacter.avatarUrl,
        mainCharacter: !!mainCharacter,
      },
    })
  } catch (error) {
    request.log.error({ err: error }, "createCharacter failed")
    return reply.code(500).send({ error: "Internal server error" })
  }
}

export const uploadArtwork = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.file()
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded" })
  }

  const uploadLimit = await loadUserUploadLimit(request.server.db, user.profileId)
  if (uploadLimit == null) {
    return reply.code(404).send({ message: "User not found" })
  }

  const { file, filename, mimetype } = data

  let uploadResult
  try {
    uploadResult = await uploadToS3(
      request.server.s3,
      file,
      filename,
      mimetype,
      user.id,
      uploadLimit
    )
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return reply.code(413).send({
        message: `File exceeds your upload limit of ${formatUploadLimit(error.limitBytes)}`,
      })
    }
    throw error
  }

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

export const updateCharacterFolder = async (request: FastifyRequest, reply: FastifyReply) => {
  const { profileId } = request.user as { profileId: string }
  const { id, folderId } = request.params as { id: string; folderId: string }

  const characterRepo = request.server.db.getRepository(Character)
  const folderRepo = request.server.db.getRepository(Folder)

  const character = await characterRepo.findOne({
    where: { id, owner: { id: profileId } },
    relations: { folder: true },
  })

  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  if (folderId === "root") {
    character.folder = null
    await characterRepo.save(character)
    return reply.code(200).send({ message: "Character removed from folder" })
  }

  const folder = await folderRepo.findOne({
    where: {
      id: folderId,
      owner: { id: profileId },
      contentType: "characters",
    },
    relations: { character: true },
  })

  if (!folder || folder.character) {
    return reply.code(404).send({ error: "Folder not found" })
  }

  character.folder = folder
  await characterRepo.save(character)

  return reply.code(200).send({ message: "Character folder updated" })
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

  const attributes = await request.server.db.getRepository(Attributes).findOne({
    where: { character: { id: data.id } }
  })

  const { attributes: bodyAttributes, mainCharacter, ...characterUpdates } = body

  await request.server.db.getRepository(Attributes).save({
    ...attributes,
    ...bodyAttributes
  })

  await request.server.db.getRepository(Character).save({
    ...data,
    ...characterUpdates
  })

  if (mainCharacter !== undefined) {
    const owner = await request.server.db.getRepository(User).findOne({
      where: { id: user.profileId },
      relations: { mainCharacter: true }
    })

    if (owner) {
      if (mainCharacter) {
        owner.mainCharacter = data
      } else if (owner.mainCharacter?.id === data.id) {
        owner.mainCharacter = null
      }
      await request.server.db.getRepository(User).save(owner)
    }
  }

  return reply.code(200).send({ message: "Character updated." })
}

export const commentCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { name, ownerHandle } = request.params as {
    name: string
    ownerHandle: string
  }

  const { content } = request.body as { content: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { slug: name, owner: { handle: ownerHandle } }
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

export const getRefsheets = async (request: FastifyRequest, reply: FastifyReply) => {
  const { handle } = request.params as { handle: string }

  const data = await request.server.db.getRepository(Character).find({
    relations: {
      refSheets: {
        variants: true,
        artistUser: true,
        character: true,
      },
      owner: true
    },
    where: { owner: { handle: handle } },
  })

  const refSheets = data.map((c) => c.refSheets).flat()

  if (!data) {
    return reply.code(404).send({ error: "No ref sheets found" })
  }

  return reply.code(200).send(refSheets)
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
  const body = request.body as {
    characterId: string
    refSheet: {
      id?: string
      name: string
      description?: string
      primary?: boolean
      userAsArtist?: boolean
      artistCredit?: ArtistCreditPayload | null
      variants: {
        id?: string
        title: string
        description?: string
        image: string
        primary: boolean
        nsfw?: boolean
        colors: string[]
      }[]
    }
  }

  const character = await request.server.db.getRepository(Character).findOne({
    where: {
      id: body.characterId,
      owner: { id: user.profileId },
    },
  })

  if (!character) return reply.status(404).send({ error: "No character found." })

  if (!body.refSheet.name?.trim()) {
    return reply.code(400).send({ error: "Ref sheet name is required." })
  }

  const owner = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
  })

  if (!owner) {
    return reply.code(404).send({ error: "User not found" })
  }

  await request.server.db.transaction(async (entityManager) => {
    const refSheetRepo = entityManager.getRepository(RefSheet)
    const variantRepo = entityManager.getRepository(RefSheetVariant)

    let refSheet: RefSheet | null = null
    if (body.refSheet.id) {
      refSheet = await refSheetRepo.findOne({
        where: {
          id: body.refSheet.id,
          character: { owner: { id: user.profileId } },
        },
        relations: { artistUser: true },
      })
    }

    if (!refSheet) {
      refSheet = refSheetRepo.create({
        character,
        active: true,
        name: body.refSheet.name,
        description: body.refSheet.description ?? "",
        primary: body.refSheet.primary ?? false,
      })
    } else {
      refSheet.character = character
      refSheet.name = body.refSheet.name
      refSheet.description = body.refSheet.description ?? refSheet.description
      refSheet.primary = body.refSheet.primary ?? refSheet.primary
      refSheet.active = true
    }

    await applyRefSheetArtistCredit({
      refSheet,
      db: entityManager,
      currentUser: owner,
      userAsArtist: body.refSheet.userAsArtist,
      artistCredit: body.refSheet.artistCredit ?? null,
    })

    await refSheetRepo.save(refSheet)

    const variantIds = body.refSheet.variants.filter((v) => v.id).map((v) => v.id!)
    const existingVariants = variantIds.length
      ? await variantRepo.findByIds(variantIds)
      : []

    for (const variant of body.refSheet.variants) {
      if (variant.id) {
        const existing = existingVariants.find((v) => v.id === variant.id)
        if (existing) {
          Object.assign(existing, {
            title: variant.title,
            description: variant.description ?? existing.description,
            url: variant.image,
            main: variant.primary,
            nsfw: variant.nsfw ?? existing.nsfw,
            colors: variant.colors,
            refSheet,
          })
          await variantRepo.save(existing)
          continue
        }
      }

      const newVariant = variantRepo.create({
        title: variant.title,
        description: variant.description ?? "",
        url: variant.image,
        nsfw: variant.nsfw ?? false,
        main: variant.primary,
        colors: variant.colors,
        refSheet,
      })

      await variantRepo.save(newVariant)
    }

    if (refSheet.id) {
      const existingForSheet = await variantRepo.find({
        where: { refSheet: { id: refSheet.id } },
      })
      const keepIds = new Set(
        body.refSheet.variants.filter((variant) => variant.id).map((variant) => variant.id!)
      )
      const removedVariants = existingForSheet.filter((variant) => !keepIds.has(variant.id))

      if (removedVariants.length > 0) {
        await variantRepo.remove(removedVariants)
      }
    }
  })

  return reply.code(200).send({ message: "Ref sheet uploaded successfully" })
}


export const setRefAsMain = async (request: FastifyRequest, reply: FastifyReply) => {
  // const user = request.user as { id: string; profileId: string }
  const { id } = request.params as { id: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { refSheets: { id: id } },
    relations: {
      refSheets: true
    }
  })

  if (!character) return reply.status(404).send("No character found.")

  const refSheets = await request.server.db.getRepository(RefSheet).find({
    where: { character: { id: character.id } }
  })

  for (const refSheet of refSheets) {
    refSheet.active = refSheet.id === id
    await request.server.db.getRepository(RefSheet).save(refSheet)
  }

  return reply.code(200).send({ message: "Ref sheet set as main" })
}

export const deleteRefsheet = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { id } = request.params as { id: string }

  const refSheet = await request.server.db
    .getRepository(RefSheet)
    .createQueryBuilder("refSheet")
    .innerJoin("refSheet.character", "character")
    .innerJoin("character.owner", "owner")
    .where("refSheet.id = :id", { id })
    .andWhere("owner.id = :profileId", { profileId: user.profileId })
    .getOne()

  if (!refSheet) {
    return reply.status(404).send({ error: "No ref sheet found." })
  }

  await request.server.db.transaction(async (manager) => {
    await manager.delete(RefSheetVariant, { refSheet: { id: refSheet.id } })
    await manager.remove(RefSheet, refSheet)
  })

  return reply.code(200).send({ message: "Ref sheet deleted" })
}

export const getFeaturedCharacters = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const data = await request.server.db.getRepository(Character).find({
    where: {
      visibility: "public"
    },
    relations: {
      owner: true,
      refSheets: {
        variants: true,
      },
      favoritedBy: true,
    },
    take: 10
  })

  if (!data) return reply.status(404).send("No featured characters found.")

  return reply.code(200).send(data)
}

export const getNewCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = await request.server.db.getRepository(Character).find({
    take: 10,
    relations: {
      owner: true,
      refSheets: {
        variants: true,
      },
      favoritedBy: true,
    },
  })

  if (!data) return reply.status(404).send("No new characters found.")

  return reply.code(200).send(data)
}

export const favoriteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { id } = request.params as { id: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { id: id },
    relations: {
      favoritedBy: true
    }
  })

  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      favoriteCharacters: true
    }
  })

  if (!character || !data) {
    return reply.code(404).send({ error: "Character not found" })
  }

  if (!data.favoriteCharacters) {
    data.favoriteCharacters = []
  }

  if (character.favoritedBy.some((c) => c.id === data.id)) {
    // Remove from favorites
    character.favoritedBy = character.favoritedBy.filter((c) => c.id !== data.id)
    await request.server.db.getRepository(Character).save(character)
    return reply.code(200).send({ message: "Character unfavorited" })
  }

  character.favoritedBy.push(data)
  await request.server.db.getRepository(Character).save(character)

  return reply.code(200).send({ message: "Character favorited" })
}

export const deleteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { profileId: string }
  const { id } = request.params as { id: string }

  const character = await request.server.db.getRepository(Character).findOne({
    relations: {
      attributes: true,
      refSheets: REF_SHEET_RELATIONS,
      migration: true,
      adoptionStatus: true,
      owner: true,
      mainOwner: true,
      dashboards: true,
      artworks: { charactersFeatured: true },
      favoritedBy: true,
    },
    where: { id, owner: { id: user.profileId } },
  })

  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  try {
    await request.server.db.transaction(async (manager) => {
      await updateOrDeleteRelatedEntities(character, manager)
      await manager.remove(Character, character)
    })
  } catch (error) {
    request.log.error(error, "Failed to delete character")
    return reply.code(500).send({ error: "Failed to delete character" })
  }

  return reply.code(200).send({ message: "Character deleted" })
}

async function updateOrDeleteRelatedEntities(
  character: Character,
  entityManager: EntityManager
) {
  await entityManager.update(
    User,
    { mainCharacter: { id: character.id } },
    { mainCharacter: null }
  )

  if (character.favoritedBy?.length) {
    for (const favoritingUser of character.favoritedBy) {
      await entityManager
        .createQueryBuilder()
        .relation(User, "favoriteCharacters")
        .of(favoritingUser.id)
        .remove(character.id)
    }
  }

  await entityManager.update(
    Artwork,
    { publishedCharacter: { id: character.id } },
    { publishedCharacter: null }
  )

  if (character.artworks?.length) {
    for (const artwork of character.artworks) {
      artwork.charactersFeatured = (artwork.charactersFeatured ?? []).filter(
        (featured) => featured.id !== character.id
      )

      if (artwork.charactersFeatured.length === 0) {
        await entityManager.remove(Artwork, artwork)
      } else {
        await entityManager.save(Artwork, artwork)
      }
    }
  }

  for (const refSheet of character.refSheets ?? []) {
    await entityManager.delete(RefSheetVariant, { refSheet: { id: refSheet.id } })
    await entityManager.remove(RefSheet, refSheet)
  }

  await entityManager.delete(Comment, { character: { id: character.id } })
  await entityManager.delete(CharacterDashboard, { character: { id: character.id } })
  await entityManager.delete(Folder, { character: { id: character.id } })

  if (character.attributes) {
    await entityManager.remove(Attributes, character.attributes)
  }

  if (character.migration) {
    await entityManager.remove(character.migration)
  }

  if (character.adoptionStatus) {
    await entityManager.remove(character.adoptionStatus)
  }

  if (character.mainOwner) {
    character.mainOwner.mainCharacter = null
    await entityManager.save(User, character.mainOwner)
  }
}
