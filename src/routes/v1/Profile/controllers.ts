import type { FastifyReply, FastifyRequest } from "fastify"
import { Character, Image, User } from "../../../models"
import { Comment as Comments } from "../../../models/Comments"
import { uploadToS3 } from "../../../utils"
import { ILike } from "typeorm"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      characters: true,
      favoriteCharacters: true,
      followers: true,
      following: true,
      notifications: {
        sender: true,
        user: true,
        comment: true,
        artwork: true
      }
    }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  if (!userData.characters) userData.characters = []
  return reply.code(200).send({ ...userData })
}

export const updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { avatarLink, birthday, displayName, pronouns } = request.body as {
    displayName: string
    pronouns: string
    birthday: Date
    avatarLink: string
  }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.displayName = displayName || userData.displayName
  userData.pronouns = pronouns || userData.pronouns
  userData.birthday = birthday || userData.birthday
  userData.avatarUrl = avatarLink || userData.avatarUrl

  const result = await request.server.db.getRepository(User).save(userData)

  if (!result) {
    return reply.code(500).send({ error: "Error updating profile" })
  }

  return reply.code(200).send({ message: "Updated" })
}

export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const { handle } = request.params as { handle: string }

  const profile = await request.server.db.getRepository(User).findOne({
    where: {
      handle: handle
    },
    relations: {
      favoriteCharacters: true,
      followers: true,
      following: true
    }
  })

  if (!profile) return reply.code(404).send({ error: "Profile not found" })

  const characters = await request.server.db.getRepository(Character).find({
    where: {
      owner: {
        id: profile.id
      }
    }
  })

  const comments = await request.server.db.getRepository(Comments).find({
    relations: {
      user: true,
      author: true
    },
    where: {
      user: {
        id: profile.id
      }
    }
  })

  return reply.code(200).send({ ...profile, characters, comments: comments })
}

export const commentProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { handle } = request.params as { handle: string }
  const { content } = request.body as { content: string }

  const profile = await request.server.db.getRepository(User).findOne({
    where: { handle: handle }
  })

  const author = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!profile || !author) {
    return reply.code(404).send({ error: "Profile not found" })
  }

  const comment = await request.server.db.getRepository(Comments).save({
    content: content,
    author: author,
    user: profile
  })

  if (!comment) {
    return reply.code(500).send({ error: "Error commenting" })
  }

  return reply.code(200).send({ message: "Commented" })
}

export const getComments = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.params as { handle: string }
  const comments = await request.server.db.getRepository(Comments).find({
    where: { user: { handle: user.handle } },
    relations: {
      author: true,
      user: true
    }
  })

  if (!comments) {
    return reply.code(404).send({ error: "No comments found" })
  }

  return reply.code(200).send(comments)
}

// Upload Route
export const upload = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.file()

  if (!data) {
    return reply.code(400).send({ error: "No file uploaded" })
  }

  const { file, filename, mimetype } = data

  if (!file) {
    return reply.code(400).send({ error: "No file uploaded" })
  }

  const result = await uploadToS3(
    request.server.s3,
    file,
    filename,
    mimetype,
    user.profileId
  )

  if (!result) {
    return reply.code(500).send({ error: "Error uploading" })
  }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  const image = await request.server.db.getRepository(Image).save({
    url: result.url,
    user: userData
  })

  if (!image) {
    return reply.code(500).send({ error: "Error saving image" })
  }

  return reply.code(200).send({ message: "Uploaded", url: result.url })
}

export const getFavorites = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.params as { handle: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { handle: user.handle }
  })

  if (!userData) return reply.code(404).send({ error: "User not found" })

  const characters = await request.server.db.getRepository(Character).find({
    where: {
      favoritedBy: {
        id: userData.id
      }
    },
    relations: {
      owner: true
    }
  })

  return reply.code(200).send(characters)
}

export const notifications = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      notifications: true
    }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  return reply.code(200).send(userData.notifications)
}

export const search = async (request: FastifyRequest, reply: FastifyReply) => {
  const { query } = request.query as { query: string }

  const users = await request.server.db.getRepository(User).find({
    where: {
      handle: ILike(`%${query}%`)
    }
  })

  if (!users) {
    return reply.code(404).send({ error: "No users found" })
  }

  return reply.code(200).send(users)
}

export const setCustomHTML = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { html } = request.body as { html: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.customHTMLCard = html

  const result = await request.server.db.getRepository(User).save(userData)

  if (!result) {
    return reply.code(500).send({ error: "Error updating profile" })
  }

  return reply.code(200).send({ message: "Updated" })
}