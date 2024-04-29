import type { FastifyInstance } from "fastify"
import {
  applyArtist,
  commentProfile,
  getComments,
  getFavorites,
  getProfile,
  me,
  notifications,
  search,
  setCustomHTML,
  updateProfile,
  upload
} from "./controllers"

async function profileRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [server.auth] }, me)
  server.get("/favorites/:handle", getFavorites)
  server.patch("/me", { onRequest: [server.auth] }, updateProfile)
  server.get("/:handle", getProfile)
  server.post("/:handle/comment", { onRequest: [server.auth] }, commentProfile)
  server.get("/:handle/comments", getComments)
  server.post("/upload", { onRequest: [server.auth] }, upload)
  server.get("/notifications", { onRequest: [server.auth] }, notifications)
  server.get("/search", search)
  server.post('/set-html', { onRequest: [server.auth] }, setCustomHTML)
  server.post('/apply/artist', { onRequest: [server.auth] }, applyArtist)
}

export default profileRoutes
