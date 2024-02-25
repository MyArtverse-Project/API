import { FastifyReply, FastifyRequest, UserRequest } from "fastify";
import { User } from "../../../models/Users";
import { uploadToS3 } from "../../../utils/images";


export const getCharacters = async (request: UserRequest, reply: FastifyReply) => {
    const user = await request.server.db.getRepository(User).findOne({
        where: { id: request.user.id }, relations: {
            characters: true
        }
    })
    return reply.code(200).send({ characters: user?.characters });
};

export const uploadArt = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await request.server.db.getRepository(User).findOne({
        where: { id: (request.user as any).id }
    })
    if (!user) {
        return reply.code(404).send({ message: "User not found" });
    }
    // Get the file from the request
    const data = await request.file();
    if (!data) {
        return reply.code(400).send({ message: "No file uploaded" });
    }
    const { file, filename, mimetype } = data;
    await uploadToS3(request.server.s3, file, filename, mimetype);

    return reply.code(200).send({ message: "Art uploaded" });
}

export const getCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ character: {} });
}

export const createCharacter = async (request: FastifyRequest, reply: FastifyReply) => {

    return reply.code(201).send({ character: {} });
}

export const updateCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ character: {} });
}
export const deleteCharacter = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ message: "Character deleted" });
}
