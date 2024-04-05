import type { FastifyInstance } from "fastify"
import { getArtwork, getCharacterArtwork, uploadArt } from "./controllers"
import { deleteCharacter } from "../Characters/controllers"

async function artRoutes(server: FastifyInstance) {
    server.post("/upload/:characterId", { onRequest: [server.auth] }, uploadArt)
    server.get("/characters/:ownerHandle/:characterName", getCharacterArtwork)
    server.get("/:artworkId", getArtwork)
}

export default artRoutes
