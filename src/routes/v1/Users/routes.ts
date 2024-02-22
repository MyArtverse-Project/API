import { FastifyInstance } from "fastify";
import { root } from "./controllers";

async function userRoutes(server: FastifyInstance) {
    server.get('/', root);
} 

export default userRoutes;