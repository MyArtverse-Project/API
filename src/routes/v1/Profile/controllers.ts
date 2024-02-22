import { FastifyReply, FastifyRequest } from "fastify"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user
  return reply.code(200).send({ user })
}
