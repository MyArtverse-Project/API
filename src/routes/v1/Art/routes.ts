import type { FastifyInstance } from "fastify"
import {
  assignArtist,
  assignArtworkToFolder,
  commentArtwork,
  deleteArtwork,
  favoriteArtwork,
  featureCharacter,
  getArtwork,
  getCharacterArtwork,
  getSelfArtworks,
  unfeatureCharacter,
  updateArtwork,
  uploadArt
} from "./controllers"

async function artRoutes(server: FastifyInstance) {
  server.post("/upload/:characterId", { onRequest: [server.auth] }, uploadArt)
  server.get(
    "/characters/:ownerHandle/:characterName",
    { onRequest: [server.optionalAuth] },
    getCharacterArtwork
  )
  server.get("/gallery", { onRequest: [server.auth] }, getSelfArtworks)
  server.put(
    "/:artworkId/folder/:folderId",
    { onRequest: [server.auth] },
    assignArtworkToFolder
  )
  server.get("/:artworkId", { onRequest: [server.optionalAuth] }, getArtwork)
  server.post("/:artworkId/favorite", { onRequest: [server.auth] }, favoriteArtwork)
  // server.get('/:artworkId/comments', getArtworkComments)
  server.post("/:artworkId/comment", { onRequest: [server.auth] }, commentArtwork)
  server.post(
    `/:artworkId/:characterId/add`,
    { onRequest: [server.auth] },
    featureCharacter
  )
  server.post(
    `/:artworkId/:characterId/remove`,
    { onRequest: [server.auth] },
    unfeatureCharacter
  )
  server.put(`/:artworkId`, { onRequest: [server.auth] }, updateArtwork)
  server.delete(`/:artworkId`, { onRequest: [server.auth] }, deleteArtwork)
  server.post(`/:artworkId/assign/:artistId`, { onRequest: [server.auth] }, assignArtist)
}

export default artRoutes
