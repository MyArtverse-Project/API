import type { FastifyInstance } from "fastify"
import { getCharacterArtwork, uploadArt } from "./controllers"

async function artRoutes(server: FastifyInstance) {
    server.post("/upload/:characterId", { onRequest: [server.auth] }, uploadArt)
    server.get("/characters/:ownerHandle/:characterName", getCharacterArtwork)
}

export default artRoutes
