import type { FastifyReply, FastifyRequest } from "fastify"
import type { EntityManager } from "typeorm"
import { Attributes, Character, User } from "../../../models"
import Artwork from "../../../models/Artwork"
import { Comment } from "../../../models/Comments"
import { RefSheet } from "../../../models/RefSheet"
import { RefSheetVariant } from "../../../models/RefSheetVarients"
import type { CreateCharacterBody, EditCharacterBody, GetCharacterParams, RefSheet as RefSheetType } from "../../../types/CharacterTypes"
import { uploadToS3 } from "../../../utils"



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
    }
  })

  const mainCharacter = await request.server.db.getRepository(Character).findOne({
    where: { owner: { handle: ownerHandle }, mainOwner: true }
  })

  if (mainCharacter) {
    const refSheets = await request.server.db.getRepository(RefSheet).find({
      where: { character: { id: mainCharacter.id } },
      relations: {
        variants: true
      }
    })
    mainCharacter.refSheets = refSheets
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
        attributes: true,
        favoritedBy: true,
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
      where: { owner: { id: profileId }, name: name },
      relations: {
        owner: true,
        attributes: true,
        mainOwner: true,
        refSheets: true,
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
  const { name, ownerHandle } = request.params as {
    name: string
    ownerHandle: string
  }

  const { content } = request.body as { content: string }

  const character = await request.server.db.getRepository(Character).findOne({
    where: { name: name, owner: { handle: ownerHandle } }
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
  const user = request.user as { id: string; profileId: string };
  const body = request.body as { refSheet: RefSheetType, characterId: string };

  const character = await request.server.db.getRepository(Character).findOneBy({
    id: body.characterId,
    owner: { id: user.profileId }
  });

  if (!character) return reply.status(404).send("No character found.");

  await request.server.db.transaction(async (entityManager) => {
    let refSheet = await entityManager.findOneBy(RefSheet, { id: body.refSheet.id });

    if (!refSheet || !body.refSheet.id) {
      delete body.refSheet.id;
      refSheet = entityManager.getRepository(RefSheet).create({
        ...body.refSheet,
        character: character,
        active: true,
      });
    } else {
      refSheet.refSheetName = body.refSheet.refSheetName;
      refSheet.colors = body.refSheet.colors;
      refSheet.active = true;
    }

    await entityManager.save(refSheet);

    for (const variant of body.refSheet.variants) {
      let refSheetVariant;
      if (variant.id) {
        refSheetVariant = await entityManager.findOneBy(RefSheetVariant, { id: variant.id });
        if (refSheetVariant) {
          Object.assign(refSheetVariant, variant, { refSheet: refSheet });
          await entityManager.save(refSheetVariant);
          continue;
        }
      }

      refSheetVariant = entityManager.getRepository(RefSheetVariant).create({
        ...variant,
        refSheet: refSheet
      });

      await entityManager.save(refSheetVariant);
    }
  });

  return reply.code(200).send({ message: "Ref sheet uploaded successfully" });
};

export const setRefAsMain = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string };
  const { id } = request.params as { id: string };
  
  const character = await request.server.db.getRepository(Character).findOne({
    where: { refSheets: { id: id } },
    relations: {
      refSheets: true
    }
  });

  if (!character) return reply.status(404).send("No character found.");

  const refSheets = await request.server.db.getRepository(RefSheet).find({
    where: { character: { id: character.id } }
  });

  for (const refSheet of refSheets) {
    refSheet.active = refSheet.id === id;
    await request.server.db.getRepository(RefSheet).save(refSheet);
  }

  return reply.code(200).send({ message: "Ref sheet set as main" })
}


export const deleteRefsheet = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string };
  const { id } = request.params as { id: string };

  const refSheet = await request.server.db.getRepository(RefSheet).findOne({
    where: { id: id, character: { owner: { id: user.profileId } } }
  });

  if (!refSheet) return reply.status(404).send("No ref sheet found.");

  const variants = await request.server.db.getRepository(RefSheetVariant).find({
    where: { refSheet: { id: refSheet.id } }
  });

  for (const variant of variants) {
    await request.server.db.getRepository(RefSheetVariant).remove(variant);
  }

  await request.server.db.getRepository(RefSheet).remove(refSheet);

  return reply.code(200).send({ message: "Ref sheet deleted" });
  
}

export const getFeaturedCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = await request.server.db.getRepository(Character).find({
    where: {
      visibility: "public",
    },
    relations: {
      owner: true,
      refSheets: true,
      favoritedBy: true
    },
    take: 10,
  })

  if (!data) return reply.status(404).send("No featured characters found.")

  return reply.code(200).send(data)
}

export const getNewCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = await request.server.db.getRepository(Character).find({
    take: 10,
    relations: {
      owner: true,
      refSheets: true,
      favoritedBy: true
    }
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
      refSheets: true,
      migration: true,
      adoptionStatus: true,
      owner: true,
    },
    where: { id: id, owner: { id: user.profileId } }
  })


  if (!character) {
    return reply.code(404).send({ error: "Character not found" })
  }

  await request.server.db.transaction(async (manager) => {
    await updateOrDeleteRelatedEntities(character, manager);
    await manager.remove(Character, character)
  })

  return reply.code(200).send({ message: "Character deleted" })
}

async function updateOrDeleteRelatedEntities(character: Character, entityManager: EntityManager) {
  if (character.artworks) {
    for (const artwork of character.artworks) {
      artwork.charactersFeatured = artwork.charactersFeatured.filter((c) => c.id !== character.id);
      if (artwork.charactersFeatured.length === 0) {
        await entityManager.remove(Artwork, artwork);
      } else {
        await entityManager.save(Artwork, artwork);
      }
    }
  }

  if (character.refSheets) {
    for (const refSheet of character.refSheets) {
      if (!refSheet.variants) continue;
      for (const variant of refSheet.variants) {
        await entityManager.remove(variant);
      }

      await entityManager.remove(RefSheet, refSheet);
    }
  }

  if (character.attributes) {
    // @ts-expect-error
    await entityManager.update(Character, { id: character.id }, { attributes: null });
    await entityManager.remove(character.attributes);
  }

  if (character.migration) {
    await entityManager.remove(character.migration);
  }

  if (character.adoptionStatus) {
    await entityManager.remove(character.adoptionStatus);
  }

  if (character.mainOwner) {
    character.mainOwner.mainCharacter = null;
    await entityManager.save(User, character.mainOwner);
  }

  if (character.owner) {
    const owner = await entityManager.findOne(User, {
      where: { id: character.owner.id },
      relations: { characters: true },
    });

    if (owner) {
      owner.characters = owner.characters.filter((c) => c.id !== character.id);
      await entityManager.save(User, owner);
    }
  }
}
