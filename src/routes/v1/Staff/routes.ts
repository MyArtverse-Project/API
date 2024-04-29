import { type FastifyInstance } from "fastify"
import { getArtistRequests, promoteUserToArtist } from "./controllers"

async function StaffRoutes(server: FastifyInstance) {
  server.put(
    "/update-artist",
    { onRequest: [server.auth, server.permissionAboveMod] },
    () => promoteUserToArtist
  )
  server.get('/artist-requests', { onRequest: [server.auth, server.permissionAboveMod] }, getArtistRequests)
}

export default StaffRoutes
