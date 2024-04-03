import type { FastifyInstance } from "fastify"
import { uploadArt } from "./controllers"

async function artRoutes(server: FastifyInstance) {
    server.post("/upload", { onRequest: [server.auth] }, uploadArt)
}

export default artRoutes
