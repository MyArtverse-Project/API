import { FastifyReply, FastifyRequest } from "fastify"

export const root = async (request: FastifyRequest, reply: FastifyReply) => {
  return { hello: "world" }
}
