import type { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../../../models"
import { IsNull, Not } from "typeorm"
import { sendNotification } from "../../../utils/notification"

export const promoteUserToArtist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { userId } = request.params as { userId: string }
  const user = await request.server.db.getRepository(User).findOne({
    where: {
      id: userId
    }
  })

  if (!user) return reply.code(404).send({ error: "User not found" })
  user.hasArtistAccess = true
  sendNotification(request.server.db, user, "Your artist application has been approved! You now have access to the artist features.")
  await request.server.db.getRepository(User).save(user)
  return reply.code(200).send({ message: "User promoted to artist" })
}

export const demoteUserToArtist = async (request: FastifyRequest, reply: FastifyReply) => {
  const { userId } = request.params as { userId: string }
  const user = await request.server.db.getRepository(User).findOne({
    where: {
      id: userId
    }
  })

  if (!user) return reply.code(404).send({ error: "User not found" })
  user.hasArtistAccess = false
  await request.server.db.getRepository(User).save(user)
  return reply.code(200).send({ message: "User demoted to artist" })
}

export const getArtistRequests = async (request: FastifyRequest, reply: FastifyReply) => {
  const requests = await request.server.db.getRepository(User).find({
    where: {
      hasArtistAccess: false,
      artistApplication: Not(IsNull())
    }
  })

  if (!requests) return reply.code(404).send({ error: "No artist requests found" })
  return reply.code(200).send(requests)
}

export const getRecentlyApprovedArtists = async (request: FastifyRequest, reply: FastifyReply) => {
  const artists = await request.server.db.getRepository(User).find({
    where: {
      hasArtistAccess: true,
      artistApplication: Not(IsNull())
    }
  })

  if (!artists) return reply.code(404).send({ error: "No artists found" })
  return reply.code(200).send(artists)
}