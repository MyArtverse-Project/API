import { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../../../models"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: number }

  const userData = await request.server.db
    .getRepository(User)
    .findOne({ where: { id: user.id } })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  return reply.code(200).send({ ...userData })
}
