import type { FastifyInstance } from "fastify"
import { commentArtwork, deleteArtwork, featureCharacter, getArtwork, getCharacterArtwork, unfeatureCharacter, updateArtwork, uploadArt } from "./controllers"
import { deleteCharacter } from "../Characters/controllers"

async function artRoutes(server: FastifyInstance) {
    server.post("/upload/:characterId", { onRequest: [server.auth] }, uploadArt)
    server.get("/characters/:ownerHandle/:characterName", getCharacterArtwork)
    server.get("/:artworkId", getArtwork)
    // server.get('/:artworkId/comments', getArtworkComments)
    server.post('/:artworkId/comment', { onRequest: [server.auth] }, commentArtwork)
    server.post(`/:artworkId/:characterId/add`, { onRequest: [server.auth] }, featureCharacter)
    server.post(`/:artworkId/:characterId/remove`, { onRequest: [server.auth] }, unfeatureCharacter)
    server.put(`/:artworkId`, { onRequest: [server.auth] }, updateArtwork)
    server.delete(`/:artworkId`, { onRequest: [server.auth] }, deleteArtwork)
}

export default artRoutes
