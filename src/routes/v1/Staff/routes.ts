import { type FastifyInstance } from "fastify"
import { demoteUserToArtist, getArtistRequests, getRecentlyApprovedArtists, promoteUserToArtist } from "./controllers"

async function StaffRoutes(server: FastifyInstance) {
  server.put("/promote/:userId/artist", { onRequest: [server.auth, server.permissionAboveMod] }, promoteUserToArtist)
  server.put("/demote/:userId/artist", { onRequest: [server.auth, server.permissionAboveMod] }, demoteUserToArtist)
  server.get('/recently-approved-artists', { onRequest: [server.auth, server.permissionAboveMod] }, getRecentlyApprovedArtists)
  server.get('/artist-requests', { onRequest: [server.auth, server.permissionAboveMod] }, getArtistRequests)
}

export default StaffRoutes
