interface UserPayload {
  id: string
  profileId?: string
}
import { FastifyReply, FastifyRequest } from "fastify"
import { Auth } from "../models"

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const accessToken = request.cookies.accessToken
  if (!accessToken) {
    return reply.code(401).send({ error: "Unauthorized" })
  }

  let payload, auth, user

  try {
    payload = await request.server.jwt.verify(accessToken)
    user = request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id }
    })
    if (!user) return reply.code(401).send({ message: "Unauthorized" })
  } catch (error) {
    const refreshToken = request.cookies.refreshToken
    if (!refreshToken) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    try {
      payload = await request.server.jwt.verify<{ id: string }>(refreshToken)
      if (!payload) {
        return reply.code(401).send({ error: "Unauthorized" })
      }

      auth = await request.server.db.getRepository(Auth).findOne({
        where: { id: payload.id },
        relations: {
          user: true
        }
      })

      if (!auth) return reply.code(401).send({ message: "Unauthorized" })
      request.user = { ...payload, profileId: auth?.user.id }
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
      request.user = { ...payload, profileId: auth?.user.id }
    }
  }
}

export default verifyToken
