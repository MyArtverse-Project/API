import type { FastifyReply, FastifyRequest } from "fastify"
import { Image, User } from "../../../models"
import { uploadToS3 } from "../../../utils"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db
    .getRepository(User)
    .findOne({ where: { id: user.profileId } })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  return reply.code(200).send({ ...userData })
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

export const uploadProfileBanner = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
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
    "user",
    user.id
  )

  if (!uploadResult) {
    return reply.code(500).send({ message: "Error uploading file" })
  }

  const image = await request.server.db.getRepository(Image).save({
    url: uploadResult.url,
    altText: filename,
    type: "user",
    ownerId: user.id
  })

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.bannerUrl = image.url
  await request.server.db.getRepository(User).save(userData)

  return reply.code(200).send({ message: "Banner uploaded", url: image.url })
}

export const uploadProfileAvatar = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
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
    "user",
    user.id
  )

  if (!uploadResult) {
    return reply.code(500).send({ message: "Error uploading file" })
  }

  const image = await request.server.db.getRepository(Image).save({
    url: uploadResult.url,
    altText: filename,
    type: "user",
    ownerId: user.id
  })

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.avatarUrl = image.url
  await request.server.db.getRepository(User).save(userData)

  return reply.code(200).send({ message: "Avatar uploaded", url: image.url })
}
