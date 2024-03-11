import type { FastifyReply, FastifyRequest } from "fastify";

export const promoteUserToArtist = (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ message: "Promoted User to artist" });
}