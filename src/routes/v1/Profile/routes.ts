import { FastifyInstance } from "fastify"
import { getProfile, me } from "./controllers"

async function profileRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [server.auth] }, me)
  server.get("/:handle", getProfile)
}

export default profileRoutes
