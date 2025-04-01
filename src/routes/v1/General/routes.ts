import { FastifyInstance } from "fastify";
import { search } from "./controllers";

export async function generalRoutes(server: FastifyInstance) {
      server.get('/search', { onRequest: [server.optionalAuth] }, search)
}