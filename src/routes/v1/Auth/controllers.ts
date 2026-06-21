/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcryptjs"
import { type FastifyReply, type FastifyRequest } from "fastify"
import { Auth, User } from "../../../models"
import { welcome, forgotPassword as forgot } from "../../../utils"
import { accessTokenOptions, refreshTokenOptions } from "../../../utils/auth"
import { getApiBaseUrl, getFrontendOrigin } from "../../../utils/config"
import { OAuth2Namespace } from "@fastify/oauth2"
import { providers } from "../../../config/oauth"
// import { html } from "@/utils"
// import { Auth, User } from "@/models"

export const refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const { refreshToken } = request.cookies
  console.log(request.cookies)
  if (!refreshToken) {
    return reply.code(401).send({ error: "Unauthorized" })
  }

  try {
    const payload = (await request.server.jwt.verify(refreshToken)) as any
    if (!payload) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const user = await request.server.db
      .getRepository(Auth)
      .findOne({ where: { id: payload.id } })

    if (!user) {
      return reply.code(401).send({ error: "Unauthorized" })
    }

    const accessToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "10m" })

    return reply
      .code(200)
      .setCookie("accessToken", accessToken, accessTokenOptions)
      .send({ accessToken })
  } catch (error) {
    return reply.code(401).send({ error: "Unauthorized" })
  }
}

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { email: string; password: string }
  if (!body.email || !body.password) {
    return reply.code(400).send({ error: "Email and password are required" })
  }

  const { email, password } = body

  // Check if email exists
  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { email: email }, relations: { user: true } })

  if (!user) {
    return reply.code(400).send({ email: "Invalid email", password: null })
  }

  if (!user?.allowPasswordLogin) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  if (!user.password) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  // Check if password is correct
  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    return reply.code(400).send({ email: null, password: "Invalid password" })
  }

  if (!user.verified) {
    return reply.code(401).send({ error: "You must be verified to login" })
  }

  const accessToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "10m" })
  const refreshToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "7d" })

  // Return the token
  return reply
    .code(200)
    .setCookie("accessToken", accessToken, accessTokenOptions)
    .setCookie("refreshToken", refreshToken, refreshTokenOptions)
    .send({
      accessToken: accessToken,
      refreshToken: refreshToken,
      handler: user.user.handle
    })
}

const verifyUserByUuid = async (
  request: FastifyRequest,
  uuid: string
): Promise<{ ok: true } | { ok: false; status: 400 | 404; error: string }> => {
  if (!uuid || uuid.length !== 36) {
    return { ok: false, status: 400, error: "Valid UUID is required" }
  }

  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { verificationUUID: uuid } })

  if (!user) {
    return { ok: false, status: 404, error: "User not found" }
  }

  if (!user.verified) {
    user.verified = true
    await request.server.db.getRepository(Auth).save(user)
  }

  return { ok: true }
}

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as {
    email: string
    password: string
    username?: string
    handle?: string
  }

  const username = body.username ?? body.handle

  if (!body.email || !body.password || !username) {
    return reply.code(400).send({ error: "Username, Email and password are required" })
  }

  const { email, password } = body

  // Check if email is already in use
  const authCheck = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { email: email } })

  // Check if username is already in use
  const userCheck = await request.server.db
    .getRepository(User)
    .findOne({ where: { handle: username } })

  if (authCheck || userCheck) {
    return reply.code(400).send({
      email: authCheck ? "Email is already in use" : null,
      username: userCheck ? "Username is already taken" : null
    })
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Insert it onto the database
  const data = await request.server.db.getRepository(Auth).save({
    email: email,
    password: hashedPassword
  })

  const profileData = await request.server.db.getRepository(User).save({
    auth: data,
    handle: username
  })

  // If there was an error, return a 500
  if (!data || !profileData) {
    return reply.code(500).send({ error: "Error creating user" })
  }

  const verifyUrl = `${getApiBaseUrl()}/v1/auth/verify/${data.verificationUUID}`
  let emailSent = true

  try {
    await request.server.mailer.sendMail({
      to: email,
      html: welcome(verifyUrl),
      subject: "Welcome to MyArtverse",
      text: `Welcome to MyArtverse, ${username}! Verify your email: ${verifyUrl}`,
    })
  } catch (error) {
    request.log.error({ err: error, email }, "Failed to send verification email")
    emailSent = false
  }

  return reply.code(201).send({
    email,
    username,
    emailSent,
    message: emailSent
      ? "Account created. Check your email to verify before logging in."
      : "Account created, but the verification email could not be sent. Try logging in later or contact support.",
  })
}

export const logout = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply
    .code(200)
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .send({ message: "Logged out" })
}

export const forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { email: string }
  if (!body.email) {
    return reply.code(400).send({ error: "Email is required" })
  }

  const { email } = body
  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { email: email } })

  if (!user) {
    return reply.code(400).send({ error: "User not found" })
  }
  if (!user.allowPasswordLogin) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  const uuid = await request.server.db.query("SELECT uuid_generate_v4()")
  user.forgotPasswordUUID = uuid[0].uuid_generate_v4
  await request.server.db.getRepository(Auth).save(user)

  try {
    await request.server.mailer.sendMail({
      to: email,
      html: forgot(
        `${getFrontendOrigin()}/recover/${user.forgotPasswordUUID}`
      ),
      subject: "Reset Password",
      text: "You have requested to reset your password. Please click the link in this email to reset your password.",
    })
  } catch (error) {
    request.log.error({ err: error, email }, "Failed to send password reset email")
    return reply.code(500).send({ error: "Error sending email" })
  }
  return reply.code(200).send({ message: "Password reset email sent" })
}

export const recoverPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { newPassword: string; uuid: string }
  if (!body.newPassword || !body.uuid) {
    return reply.code(400).send({ error: "New password and UUID are required" })
  }

  const { newPassword, uuid } = body
  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { forgotPasswordUUID: uuid } })
  if (!user) {
    return reply.code(400).send({ error: "User not found" })
  }

  if (!user.allowPasswordLogin) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10)
  user.password = hashedPassword
  await request.server.db.getRepository(Auth).save(user)
  return reply.code(200).send({ message: "Password changed" })
}

export const validate = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { uuid: string }
  if (!body.uuid) {
    return reply.code(400).send({ error: "UUID are required" })
  }

  const { uuid } = body
  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { forgotPasswordUUID: uuid } })
  if (!user) {
    return reply.code(400).send({ error: "User not found" })
  }

  if (!user.allowPasswordLogin) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  return reply.code(200).send({ message: "User found" })
}

export const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { newPassword: string; userId: string }
  if (!body.newPassword) {
    return reply.code(400).send({ error: "New password is required" })
  }

  const { newPassword, userId } = body
  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { id: userId } })

  if (!user) {
    return reply.code(400).send({ error: "User not found" })
  }

  if (!user.allowPasswordLogin) {
    return reply.code(403).send({ error: "You must login with OAuth" })
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10)
  user.password = hashedPassword
  await request.server.db.getRepository(Auth).save(user)

  return reply.code(200).send({ message: "Password changed" })
}

export const whoami = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string }
  const data = await request.server.db.getRepository(Auth).findOne({
    where: { id: user.id },
    relations: {
      user: {
        characters: true,
        notifications: {
          sender: true,
          artwork: true,
          comment: true,
          character: true
        },
      }
    }
  })

  if (!data) {
    return reply.code(401).send({ error: "Unauthorized" })
  }

  return reply.code(200).send({ ...data.user })
}

export const verify = async (request: FastifyRequest, reply: FastifyReply) => {
  const { uuid } = request.params as { uuid: string }
  const result = await verifyUserByUuid(request, uuid)

  if (!result.ok) {
    return reply.code(result.status).send({ error: result.error })
  }

  return reply.code(200).send({ message: "User verified" })
}

export const verifyEmailLink = async (request: FastifyRequest, reply: FastifyReply) => {
  const { uuid } = request.params as { uuid: string }
  const loginUrl = `${getFrontendOrigin()}/login`
  const result = await verifyUserByUuid(request, uuid)

  if (!result.ok) {
    const error =
      result.status === 400 ? "invalid_verification_link" : "verification_link_expired"
    return reply.redirect(`${loginUrl}?error=${error}`)
  }

  return reply.redirect(`${loginUrl}?verified=1`)
}

export const getOauthLink = async (request: FastifyRequest, reply: FastifyReply) => {
  const { provider } = request.params as { provider: string }

  // @ts-expect-error
  const oauth2 = request.server[`${provider}OAuth`] as OAuth2Namespace

  if (!oauth2) {
    return reply.code(500).send({ error: `OAuth provider ${provider} not configured` })
  }
  if (!provider || !providers.includes(provider)) {
    return reply.code(400).send({ error: "Invalid provider" })
  }

  // Generate the authorization URL
  const uri = await oauth2.generateAuthorizationUri(request, reply)

  return reply.redirect(uri)
}

export const loginWithOAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const { provider } = request.params as { provider: string }
  if (!provider) {
    return reply.code(400).send({ error: "Provider is required" })
  }

  if (!providers.includes(provider)) {
    return reply.code(400).send({ error: "Invalid provider" })
  }

  try {
    // @ts-expect-error
    const oauth2 = request.server[`${provider}OAuth`] as OAuth2Namespace
    if (!oauth2) {
      return reply.code(500).send({ error: `OAuth provider ${provider} not configured` })
    }

    const { token: tokenResponse } =
      await oauth2.getAccessTokenFromAuthorizationCodeFlow(request)
    if (!tokenResponse || !tokenResponse.access_token) {
      return reply.code(400).send({ error: "Failed to obtain access token" })
    }

    const oauthAcessToken = tokenResponse.access_token

    let userInfo
    if (provider === "google") {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${oauthAcessToken}` }
      })
      userInfo = await res.json()
    } else if (provider === "facebook") {
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${oauthAcessToken}`
      )
      userInfo = await res.json()
    } else if (provider === "twitter") {
      const res = await fetch("https://api.twitter.com/2/users/me", {
        headers: { Authorization: `Bearer ${oauthAcessToken}` }
      })
      userInfo = await res.json()
    }

    if (!userInfo) {
      return reply.code(400).send({ error: "Failed to retrieve user info" })
    }

    console.log(userInfo)

    let auth = await request.server.db.getRepository(Auth).findOne({
      where: { email: userInfo.email }
    })

    if (auth?.allowPasswordLogin) {
      return reply.code(403).send({ error: "You must login with your password" })
    }

    if (!auth) {
      auth = await request.server.db.getRepository(Auth).save({
        email: userInfo.email,
        password: null,
        allowPasswordLogin: false,
        verified: true
      })

      const randomUsername = "user_" + Math.floor(Math.random() * 10000)

      const profileData = await request.server.db.getRepository(User).save({
        auth: auth,
        handle: randomUsername
      })

      // If there was an error, return a 500
      if (!auth || !profileData) {
        return reply.code(500).send({ error: "Error creating user" })
      }
    }

    const profileData = await request.server.db.getRepository(User).findOne({
      where: { auth: { id: auth.id } }
    })

    if (!profileData) {
      return reply.code(500).send({ error: "Error finding user profile" })
    }

    const accessToken = request.server.jwt.sign({ id: auth.id }, { expiresIn: "10m" })
    const refreshToken = request.server.jwt.sign({ id: auth.id }, { expiresIn: "7d" })

    return reply
      .setCookie("accessToken", accessToken, accessTokenOptions)
      .setCookie("refreshToken", refreshToken, refreshTokenOptions)
      .redirect(
        `${getFrontendOrigin()}/@${profileData.handle}`
      )
  } catch (error) {
    console.error(`OAuth Error (${provider}):`, error)
    return reply.code(500).send({ error: "OAuth authentication failed" })
  }
}
