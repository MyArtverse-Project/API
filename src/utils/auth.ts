import type { FastifyReply, FastifyRequest } from "fastify"
import { Auth } from "../models"
import { CookieSerializeOptions } from "@fastify/cookie"
import { getCookieDomain } from "./config"

export const accessTokenOptions: CookieSerializeOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "none",
  domain: getCookieDomain(),
  secure: true
}

export const refreshTokenOptions: CookieSerializeOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "none",
  domain: getCookieDomain(),
  secure: true
}

export const ACCESS_TOKEN_EXPIRES_IN = "10m" as const

/** Cookie jar from @fastify/cookie, or Cookie header (Next.js server actions). */
const getAccessToken = (request: FastifyRequest): string | undefined => {
  const authorization = request.headers.authorization
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim()
  }

  if (request.cookies.accessToken) {
    return request.cookies.accessToken
  }

  const cookieHeader = request.headers.cookie
  if (!cookieHeader) {
    return undefined
  }

  const match = cookieHeader.match(/(?:^|;\s*)accessToken=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

const getRefreshToken = (request: FastifyRequest): string | undefined => {
  if (request.cookies.refreshToken) {
    return request.cookies.refreshToken
  }

  const cookieHeader = request.headers.cookie
  if (!cookieHeader) {
    return undefined
  }

  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : undefined
}

const authenticateWithAccessToken = async (
  request: FastifyRequest,
  accessToken: string
): Promise<boolean> => {
  const payload = (await request.server.jwt.verify(accessToken)) as { id: string }
  const user = await request.server.db.getRepository(Auth).findOne({
    where: { id: payload.id },
    relations: { user: true }
  })

  if (!user) {
    return false
  }

  request.user = { id: payload.id, profileId: user.user.id }
  return true
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return await refreshTokenLogic(request, reply, true)
  }

  try {
    const authenticated = await authenticateWithAccessToken(request, accessToken)
    if (!authenticated) {
      return await refreshTokenLogic(request, reply, true)
    }

    return true
  } catch (error) {
    return await refreshTokenLogic(request, reply, true)
  }
}

export async function optionalAuthMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const accessToken = getAccessToken(request)
  let authenticated = false

  if (accessToken) {
    try {
      authenticated = await authenticateWithAccessToken(request, accessToken)
    } catch (error) {}
  }

  if (!authenticated) {
    await refreshTokenLogic(request, reply, false)
  }
}

async function refreshTokenLogic(request: FastifyRequest, reply: FastifyReply, force401 = false) {
  const refreshToken = getRefreshToken(request)
  if (!refreshToken) return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null

  try {
    const payload = (await request.server.jwt.verify<{ id: string }>(refreshToken)) as { id: string }
    const auth = await request.server.db.getRepository(Auth).findOne({
      where: { id: payload.id },
      relations: { user: true }
    })

    if (!auth) return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null

    const newAccessToken = request.server.jwt.sign(
      { id: payload.id },
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    )
    reply.setCookie("accessToken", newAccessToken, accessTokenOptions)

    request.user = { id: payload.id, profileId: auth.user.id }
    return true
  } catch (error) {
    return force401 ? reply.code(401).send({ error: "Unauthorized" }) : null
  }
}
