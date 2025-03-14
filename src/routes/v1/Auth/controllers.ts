/* eslint-disable @typescript-eslint/no-explicit-any */
import bcrypt from "bcrypt"
import type { FastifyReply, FastifyRequest } from "fastify"
import { Auth, User } from "../../../models"
import { welcome, forgotPassword as forgot } from "../../../utils"
import { accessTokenOptions, refreshTokenOptions } from "../../../utils/auth"
// import { html } from "@/utils"
// import { Auth, User } from "@/models"

export const refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const { refreshToken } = request.cookies
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

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as {
    email: string
    password: string
    username: string
  }

  if (!body.email || !body.password || !body.username) {
    return reply.code(400).send({ error: "Username, Email and password are required" })
  }

  const { email, password, username } = body

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

  try {
    request.server.mailer.sendMail({
      from: process.env.SMTP_EMAIL_FROM,
      to: email,
      html: welcome(
        `${process.env.MA_FRONTEND_HTTP}${process.env.MA_FRONTEND_DOMAIN}:${process.env.MA_FRONTEND_PORT}/verify/${data.verificationUUID}`
      ),
      subject: "Welcome to MyArtverse",
      text: `Welcome to MyArtverse, ${username}!, Your account has been created. Please verify your email by clicking the link below: `
    })
  } catch (error) {
    throw new Error(`Error sending email: ${error}`)
  }

  // Return the token
  return reply.code(201).send({ email, username })
}

export const logout = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply
    .code(200)
    .clearCookie("refreshToken")
    .clearCookie("accessToken")
    .send({ message: "Logged out" })
}

export const forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  // TODO: Make it so it sends an email with a link to reset the password
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

  // Generate a password reset UUID
  // Generate new UUID
  const uuid = await request.server.db.query("SELECT uuid_generate_v4()")
  user.forgotPasswordUUID = uuid[0].uuid_generate_v4
  await request.server.db.getRepository(Auth).save(user)

  try {
    request.server.mailer.sendMail({
      from: process.env.SMTP_EMAIL_FROM,
      to: email,
      html: forgot(
        `${process.env.MA_FRONTEND_HTTP}${process.env.MA_FRONTEND_DOMAIN}:${process.env.MA_FRONTEND_PORT}/recover/${user.forgotPasswordUUID}`
      ),
      subject: "Reset Password",
      text: `You have requested to reset your password. Please click the link below to reset your password: `
    })
  } catch (error) {
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

  const hashedPassword = bcrypt.hashSync(newPassword, 10)
  user.password = hashedPassword
  await request.server.db.getRepository(Auth).save(user)

  return reply.code(200).send({ message: "Password changed" })
}

export const whoami = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string }
  const data = await request.server.db.getRepository(Auth).findOne({
    where: { id: user.id },
    relations: { user: true }
  })

  if (!data) {
    return reply.code(401).send({ error: "Unauthorized" })
  }

  return reply.code(200).send({ ...data.user })
}

export const verify = async (request: FastifyRequest, reply: FastifyReply) => {
  const { uuid } = request.params as { uuid: string }
  if (!uuid || uuid.length !== 36) {
    return reply.code(400).send({ error: "Valid UUID is required" })
  }

  const user = await request.server.db
    .getRepository(Auth)
    .findOne({ where: { verificationUUID: uuid } })

  if (!user) {
    return reply.code(404).send({ error: "User not found" })
  }

  user.verified = true
  await request.server.db.getRepository(Auth).save(user)

  return reply.code(200).send({ message: "User verified" })
}
