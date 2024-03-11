import { type FastifyInstance } from "fastify";
import { promoteUserToArtist } from "./controllers";

async function StaffRoutes(server: FastifyInstance) {
    server.put("/update-artist", { onRequest: [server.auth, server.permissionAboveMod] }, () => promoteUserToArtist)
}

export default StaffRoutes;