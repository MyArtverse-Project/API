import type { FastifyInstance } from "fastify"
import {
  commentProfile,
  getComments,
  getProfile,
  me,
  updateProfile,
  upload
} from "./controllers"
import { GET_PROFILE_SCHEMA, ME_SCHEMA } from "./schemas"

async function profileRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [server.auth] }, me)
  server.patch("/me", { onRequest: [server.auth] }, updateProfile)
  server.get("/:handle", { schema: GET_PROFILE_SCHEMA }, getProfile)
  server.post("/:handle/comment", { onRequest: [server.auth] }, commentProfile)
  server.get("/:handle/comments", getComments)
  server.post("/upload", { onRequest: [server.auth] }, upload)
}

export default profileRoutes
