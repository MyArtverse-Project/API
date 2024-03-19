import type { FastifyInstance } from "fastify"
import {
  createCharacter,
  deleteCharacter,
  getCharacterById,
  getCharacterByName,
  getCharacters,
  getOwnersCharacters,
  updateCharacter,
  setArtAsAvatar,
  setArtAsRefSheet,
  uploadArtwork,
  uploadRefSheet,
  getComments,
  commentCharacter
} from "./controllers"
import {
  CREATE_CHARACTER_SCHEMA,
  GET_CHARACTER_BY_ID_SCHEMA,
  GET_CHARACTER_BY_NAME_SCHEMA
} from "./schema"

export async function characterRoutes(server: FastifyInstance) {
  server.get("/", { onRequest: [server.auth] }, getCharacters)
  server.get("/:ownerHandle", getOwnersCharacters)
  server.get("/id/:id", { schema: GET_CHARACTER_BY_ID_SCHEMA }, getCharacterById)
  server.get(
    "/name/:ownerHandle/:name",
    { schema: GET_CHARACTER_BY_NAME_SCHEMA },
    getCharacterByName
  )
  server.post(
    "/create",
    { preHandler: [server.auth], schema: CREATE_CHARACTER_SCHEMA },
    createCharacter
  )
  server.delete("/:safename/delete", { onRequest: [server.auth] }, deleteCharacter)
  server.post("/upload-artwork", { onRequest: [server.auth] }, () => uploadArtwork)
  server.post("/upload-ref-sheet", { onRequest: [server.auth] }, () => uploadRefSheet)
  server.post("/assign-ref-sheet", { onRequest: [server.auth] }, () => setArtAsRefSheet)
  server.post("/assign-avatar", { onRequest: [server.auth] }, () => setArtAsAvatar)
  server.put("/update/:id", { preHandler: [server.auth] }, updateCharacter)
  server.post(
    "/:handle/:safeName/comment",
    { onRequest: [server.auth] },
    commentCharacter
  )
  server.get("/:handle/:safeName/comments", getComments)
}
