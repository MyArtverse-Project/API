import { FastifyInstance } from "fastify"
import { getProfile, me, uploadProfileAvatar, uploadProfileBanner } from "./controllers"

async function profileRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [server.auth] }, me)
  server.get("/:handle", getProfile)
  server.put("/upload-avatar", { onRequest: [server.auth] }, uploadProfileAvatar)
  server.put("/upload-banner", { onRequest: [server.auth] }, uploadProfileBanner)
}

export default profileRoutes
