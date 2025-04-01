import type { FastifyReply, FastifyRequest } from "fastify"
import { Auth } from "../models"

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.accessToken
  if (!accessToken) {
    return await refreshTokenLogic(request, reply, true)
  }

  try {
    const payload = (await request.server.jwt.verify(accessToken)) as { id: string }
    const user = await request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id },
      relations: { user: true }
    })

    if (!user) {
      return await refreshTokenLogic(request, reply, true)
    }

    request.user = { id: payload.id, profileId: user.user.id }
    return true
  } catch (error) {
    return await refreshTokenLogic(request, reply, true)
  }
}

export async function optionalAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = request.cookies.accessToken
  let authenticated = false

  if (accessToken) {
    try {
      const payload = (await request.server.jwt.verify(accessToken)) as { id: string }
      const user = await request.server.db.getRepository(Auth).findOne({
        where: { id: payload.id },
        relations: { user: true }
      })

      if (user) {
        request.user = { id: payload.id, profileId: user.user.id }
        authenticated = true
      }
    } catch (error) {}
  }

  if (!authenticated) {
    await refreshTokenLogic(request, reply, false)
  }
}

async function refreshTokenLogic(request: FastifyRequest, reply: FastifyReply, force401 = false) {
  const refreshToken = request.cookies.refreshToken
  if (!refreshToken) return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null

  try {
    const payload = (await request.server.jwt.verify<{ id: string }>(refreshToken)) as { id: string }
    const auth = await request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id },
      relations: { user: true }
    })

    if (!auth) return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null

    const newAccessToken = request.server.jwt.sign({ id: payload.id })
    reply.setCookie("accessToken", newAccessToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      domain: "localhost",
      secure: true
    })

    request.user = { id: payload.id, profileId: auth.user.id }
    return true
  } catch (error) {
    return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null
  }
}
