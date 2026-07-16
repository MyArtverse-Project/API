import type { FastifyInstance } from "fastify"
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  whoami,
  verify,
  verifyEmailLink,
  recoverPassword,
  validate,
  loginWithOAuth,
  getOauthLink
} from "./controllers"
import {
  CHANGE_PASSWORD_SCHEMA,
  FORGOT_PASSWORD_SCHEMA,
  LOGIN_SCHEMA,
  RECOVER_PASSWORD_SCHEMA,
  REFRESH_TOKEN_SCHEMA,
  REGISTER_SCHEMA,
  VALIDATE_SCHEMA,
  VERIFY_SCHEMA,
  WHOAMI_SCHEMA
} from "./schemas"
import {
  changePasswordRateLimit,
  oauthRateLimit,
  refreshRateLimit,
  strictAuthRateLimit,
} from "../../../utils/rateLimit"

async function authRoutes(server: FastifyInstance) {
  server.post("/login", { config: strictAuthRateLimit, schema: LOGIN_SCHEMA }, login)
  server.post("/register", { config: strictAuthRateLimit, schema: REGISTER_SCHEMA }, register)
  server.post("/logout", { onRequest: [server.auth] }, logout)
  server.post("/forgot", { config: strictAuthRateLimit, schema: FORGOT_PASSWORD_SCHEMA }, forgotPassword)
  server.post("/recover", { config: strictAuthRateLimit, schema: RECOVER_PASSWORD_SCHEMA }, recoverPassword)
  server.post("/validate", { config: strictAuthRateLimit, schema: VALIDATE_SCHEMA }, validate)
  server.post(
    "/change-password",
    { onRequest: [server.auth], config: changePasswordRateLimit, schema: CHANGE_PASSWORD_SCHEMA },
    changePassword
  )
  server.post("/refresh-token", { config: refreshRateLimit, schema: REFRESH_TOKEN_SCHEMA }, refreshToken)
  server.get("/whoami", { onRequest: [server.auth], schema: WHOAMI_SCHEMA }, whoami)
  server.get("/verify/:uuid", verifyEmailLink)
  server.post("/verify/:uuid", { schema: VERIFY_SCHEMA }, verify)
  server.get('/:provider/callback', { config: oauthRateLimit }, loginWithOAuth)
  server.get('/:provider/link', { config: oauthRateLimit }, getOauthLink)
}

export default authRoutes
