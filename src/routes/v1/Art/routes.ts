import type { FastifyInstance } from "fastify"
import { commentArtwork, getArtwork, getCharacterArtwork, uploadArt } from "./controllers"
import { deleteCharacter } from "../Characters/controllers"

async function artRoutes(server: FastifyInstance) {
    server.post("/upload/:characterId", { onRequest: [server.auth] }, uploadArt)
    server.get("/characters/:ownerHandle/:characterName", getCharacterArtwork)
    server.get("/:artworkId", getArtwork)
    // server.get('/:artworkId/comments', getArtworkComments)
    server.post('/:artworkId/comment', { onRequest: [server.auth] }, commentArtwork)
    server.post(`/:artworkId/:characterId`, { onRequest: [server.auth] }, commentArtwork)
}

export default artRoutes
