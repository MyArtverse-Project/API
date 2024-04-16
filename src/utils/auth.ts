import type { FastifyReply, FastifyRequest } from "fastify"
import { Auth } from "../models"

interface UserPayload {
  id: string
  profileId?: string
}

const sendUnauthorizedResponse = (
  reply: FastifyReply,
  message: string = "Unauthorized"
) => {
  reply.clearCookie("accessToken").clearCookie("refreshToken")
  return reply.code(401).send({ error: message })
}

const refreshTokenLogic = async (request: FastifyRequest, reply: FastifyReply) => {
  const refreshToken = request.cookies.refreshToken
  if (!refreshToken) return sendUnauthorizedResponse(reply)

  try {
    const payload = (await request.server.jwt.verify<{ id: string }>(
      refreshToken
    )) as UserPayload

    const auth = await request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id },
      relations: { user: true }
    })

    if (!auth) return sendUnauthorizedResponse(reply)

    const newAccessToken = request.server.jwt.sign({ id: payload.id })
    reply.setCookie("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      domain: "localhost",
      secure: false
    })

    request.user = { ...payload, profileId: auth.user.id }
    return true
  } catch (error) {
    return sendUnauthorizedResponse(reply)
  }
}

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const accessToken = request.cookies.accessToken
  if (!accessToken) {
    return await refreshTokenLogic(request, reply)
  }

  try {
    const payload = (await request.server.jwt.verify(accessToken)) as UserPayload
    const user = await request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id },
      relations: { user: true }
    })

    if (!user) {
      return await refreshTokenLogic(request, reply)
    }

    request.user = { ...payload, profileId: user.user.id }
    return
  } catch (error) {
    return await refreshTokenLogic(request, reply)
  }
}

export default verifyToken
