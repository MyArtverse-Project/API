import { FastifyInstance } from "fastify";
import { me } from "./controllers";

async function profileRoutes(server: FastifyInstance) {
    server.get("/me", { onRequest: [server.auth] }, me);
} 

export default profileRoutes;