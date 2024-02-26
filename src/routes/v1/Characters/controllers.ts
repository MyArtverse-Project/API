import { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../../../models"
import { uploadToS3 } from "../../../utils"
// import { uploadToS3 } from "@/utils"
// import User from "@/models/Users"

export const getCharacters = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await request.server.db.getRepository(User).findOne({
    // @ts-expect-error: Logged in user will have an ID
    // TODO: Extend the request object to include the user ID
    where: { id: request.user.id },
    relations: {
      characters: true
    }
  })
  return reply.code(200).send({ characters: user?.characters })
}

export const uploadArt = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = await request.server.db.getRepository(User).findOne({
    // @ts-expect-error: Logged in user will have an ID
    // TODO: Extend the request object to include the user ID
    where: { id: request.user.id }
  })
  if (!user) {
    return reply.code(404).send({ message: "User not found" })
  }
  // Get the file from the request
  const data = await request.file()
  if (!data) {
    return reply.code(400).send({ message: "No file uploaded" })
  }
  const { file, filename, mimetype } = data
  await uploadToS3(request.server.s3, file, filename, mimetype)

  return reply.code(200).send({ message: "Art uploaded" })
}

export const getCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ character: {} })
}

export const createCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(201).send({ character: {} })
}

export const updateCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ character: {} })
}
export const deleteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Character deleted" })
}
