import type { FastifyRequest } from "fastify"
import { Auth, User } from "../../../models"

export const getUserAuthById = async (request: FastifyRequest, authId: string) => {
    return await request.server.db
        .getRepository(Auth)
        .findOne({ where: { id: authId } })
}

export const getUserByEmail = async (request: FastifyRequest, email: string) => {
    return await request.server.db
        .getRepository(Auth)
        .findOne({ where: { email: email }, relations: { user: true } })
}

export const getUserByUsername = async (request: FastifyRequest, username: string) => {
    return await request.server.db
        .getRepository(User)
        .findOne({ where: { handle: username } })
}

export const createUser = async (request: FastifyRequest, username: string, email: string, password: string) => {
    const auth = await request.server.db.getRepository(Auth).save({
        email: email,
        password: password
    })

    const user = await request.server.db.getRepository(User).save({
        auth: auth,
        handle: username
    })
    

    return { verificationUUID: auth.verificationUUID, user }
}