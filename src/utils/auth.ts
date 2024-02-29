import { FastifyReply, FastifyRequest } from "fastify"

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const payload = await request.jwtVerify<{ id: string }>()
    request.user = payload
  } catch (error) {
    return reply.code(401).send({ error: "Unauthorized" })
  }
}

export default verifyToken
