import type { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../../../models"
import { IsNull, Not } from "typeorm"

export const promoteUserToArtist = (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Promoted User to artist" })
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