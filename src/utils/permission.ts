import type { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../models"
import { Role } from "../models/Users"

export const checkModAbovePermissions = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!data) {
    return reply.code(404).send({ error: "No user found." })
  }

  const userHasElevatedRoles =
    data.role == Role.MODERATOR || data.role == Role.ADMIN || data.role == Role.DEVELOPER

  if (!userHasElevatedRoles) {
    return reply.code(403).send({ error: "User does not have permission." })
  }
}

export const checkArtistPermissions = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!data) {
    return reply.code(404).send({ error: "No user found." })
  }

  if (!data.hasArtistAccess) {
    return reply.code(403).send({ error: "User does not have permission." })
  }
}