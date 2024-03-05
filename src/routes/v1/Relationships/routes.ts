import type { FastifyInstance } from "fastify"
import { root } from "./controllers"

async function relationshipRoutes(server: FastifyInstance) {
  server.get("/", root)
}

export default relationshipRoutes
