import type { FastifyInstance } from "fastify"
import {
  createCharacter,
  // deleteCharacter,
  getCharacterById,
  getCharacterByName,
  getCharacters,
  getOwnersCharacters,
  setArtAsAvatar,
  uploadArtwork,
  uploadRefSheet,
  getComments,
  commentCharacter,
  getCharacterWithOwner,
  updateCharacter,
  getFeaturedCharacters,
  getNewCharacters,
  favoriteCharacter,
  deleteCharacter,
  setRefAsMain,
  deleteRefsheet,
  searchCharacters,
  getRefsheets
} from "./controllers"
import {
  CREATE_CHARACTER_SCHEMA,
  GET_CHARACTER_BY_ID_SCHEMA
  // GET_CHARACTER_BY_NAME_SCHEMA
} from "./schema"

export async function characterRoutes(server: FastifyInstance) {
  server.get("/", { onRequest: [server.auth] }, getCharacters)
  server.get("/featured", getFeaturedCharacters)
  server.get("/new", getNewCharacters)
  server.delete("/delete/:id", { onRequest: [server.auth] }, deleteCharacter)
  server.post("/favorite/:id", { onRequest: [server.auth] }, favoriteCharacter)
  server.get("/:ownerHandle", getOwnersCharacters)
  server.get("/id/:id", getCharacterById)
  server.get(
    "/name/:ownerHandle/:name",

    getCharacterByName
  )
  server.post(
    "/create",
    { preHandler: [server.auth], schema: CREATE_CHARACTER_SCHEMA },
    createCharacter
  )
  server.get("/me/:name", { onRequest: [server.auth] }, getCharacterWithOwner)
  // server.delete("/:safename/delete", { onRequest: [server.auth] }, deleteCharacter)
  server.post("/upload-artwork", { onRequest: [server.auth] }, uploadArtwork)
  server.post("/upload-ref", { onRequest: [server.auth] }, uploadRefSheet)
  server.put("/assign-ref/:id", { onRequest: [server.auth] }, setRefAsMain)
  server.delete("/delete-ref/:id", { onRequest: [server.auth] }, deleteRefsheet)
  server.post("/assign-avatar", { onRequest: [server.auth] }, setArtAsAvatar)
  server.put("/update/:id", { preHandler: [server.auth] }, updateCharacter)
  server.post("/:handle/:name/comment", { onRequest: [server.auth] }, commentCharacter)
  server.get("/:handle/refSheets", getRefsheets)
  server.get("/:handle/:name/comments", getComments)
  server.get("/search", searchCharacters)
}
