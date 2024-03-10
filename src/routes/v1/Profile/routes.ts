import type { FastifyInstance } from "fastify"
import { getProfile, me, uploadProfileAvatar, uploadProfileBanner } from "./controllers"
import {
  GET_PROFILE_SCHEMA,
  ME_SCHEMA,
  UPLOAD_PROFILE_AVATAR_SCHEMA,
  UPLOAD_PROFILE_BANNER_SCHEMA
} from "./schemas"

async function profileRoutes(server: FastifyInstance) {
  server.get("/me", { onRequest: [server.auth], schema: ME_SCHEMA }, me)
  server.get("/:handle", { schema: GET_PROFILE_SCHEMA }, getProfile)
  server.put(
    "/upload-avatar",
    { onRequest: [server.auth], schema: UPLOAD_PROFILE_AVATAR_SCHEMA },
    uploadProfileAvatar
  )
  server.put(
    "/upload-banner",
    { onRequest: [server.auth], schema: UPLOAD_PROFILE_BANNER_SCHEMA },
    uploadProfileBanner
  )
  // TODO: Designate Account as Artist
}

export default profileRoutes
