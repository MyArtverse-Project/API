import { FastifyReply, FastifyRequest } from "fastify";

const verifyToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const { accessToken } = request.cookies;
    if (!accessToken) {
        return reply.code(401).send({ error: "Unauthorized" });
    }
    try {
        const payload = await request.server.jwt.verify(accessToken)
        if (!payload) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        request.user = payload as { id: number };
        return;
    } catch (error) {
        reply.code(401).send({ error: "Unauthorized" });
    }
}

export default verifyToken;