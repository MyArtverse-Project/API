import { FastifyInstance } from "fastify";
import {
    createCharacter,
    deleteCharacter,
    getCharacter,
    getCharacters,
    updateCharacter,
    uploadArt
} from './controllers'

export async function characterRoutes(server: FastifyInstance) {
    server.get("/characters", { preHandler: [server.auth] }, getCharacters);
    server.get("/characters/:id", { preHandler: [server.auth] }, getCharacter);
    server.post("/characters", { preHandler: [server.auth] }, createCharacter);
    server.put("/characters/:id", { preHandler: [server.auth] }, updateCharacter);
    server.delete("/characters/:id", { preHandler: [server.auth] }, deleteCharacter);
    server.post("/characters/upload", { preHandler: [server.auth] }, uploadArt);
}