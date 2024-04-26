import type { FastifyInstance } from "fastify"
import { follow, root, unfollow } from "./controllers"

async function relationshipRoutes(server: FastifyInstance) {
  server.get("/", root)
  server.post('/follow/:id', { onRequest: [server.auth] }, follow)
  server.post('/unfollow/:id', { onRequest: [server.auth] }, unfollow)
}

export default relationshipRoutes
