import { FastifyReply, FastifyRequest } from "fastify"
import { User } from "../../../models"
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

export const getCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ character: {} })
}

export const createCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(201).send({ character: {} })
}

export const updateCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ character: {} })
}

export const deleteCharacter = async (_request: FastifyRequest, reply: FastifyReply) => {
  return reply.code(200).send({ message: "Character deleted" })
}
