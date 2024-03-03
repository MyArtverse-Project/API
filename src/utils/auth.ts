import { FastifyReply, FastifyRequest } from "fastify"

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const accessToken = request.cookies.accessToken
  if (!accessToken) {
    return reply.code(401).send({ error: "Unauthorized" })
  }

  let payload

  try {
    payload = await request.server.jwt.verify(accessToken)
  } catch (error) {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    try {
      payload = await request.server.jwt.verify<{ id: string }>(refreshToken)
      request.user = payload
      // Send new access token
      const newAccessToken = request.server.jwt.sign({ id: payload.id })
      reply.setCookie("accessToken", newAccessToken, {
        httpOnly: true,
        path: "/",
        sameSite: "strict"
      })
    } catch (error) {
      reply.clearCookie("refreshToken").clearCookie("accessToken")
      return reply.code(401).send({ error: "Unauthorized" })
    }
  } finally {
    if (payload) {
      request.user = payload
    }
  }
}

export default verifyToken
