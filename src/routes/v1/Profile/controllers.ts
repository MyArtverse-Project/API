import type { FastifyReply, FastifyRequest } from "fastify"
import { Image, User } from "../../../models"
import { Comment as Comments } from "../../../models/Comments"
import { uploadToS3 } from "../../../utils"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      characters: true
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
    }
  })

  if (profile) return reply.code(200).send({ ...profile })

  return reply.code(404).send({ error: "Profile not found" })
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
