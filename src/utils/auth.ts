import { FastifyReply, FastifyRequest } from "fastify";

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const { token } = request.cookies;
    if (!token) {
        return reply.code(401).send({ error: "Unauthorized" });
    }
    try {
        const payload = await request.server.jwt.verify(token)
        if (!payload) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        return;
    } catch (error) {
        reply.code(401).send({ error: "Unauthorized" });
    }
}

export default verifyToken;