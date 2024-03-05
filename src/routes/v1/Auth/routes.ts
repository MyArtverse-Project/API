import { FastifyInstance } from "fastify"
import {
  changePassword,
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  whoami,
  verify
} from "./controllers"
import {
  CHANGE_PASSWORD_SCHEMA,
  FORGOT_PASSWORD_SCHEMA,
  LOGIN_SCHEMA,
  REFRESH_TOKEN_SCHEMA,
  REGISTER_SCHEMA,
  VERIFY_SCHEMA,
  WHOAMI_SCHEMA
} from "./schemas"

async function authRoutes(server: FastifyInstance) {
  server.post("/login", { schema: LOGIN_SCHEMA }, login)
  server.post("/register", { schema: REGISTER_SCHEMA }, register)
  server.post("/logout", { onRequest: [server.auth] }, logout)
  server.post("/forgot-password", { schema: FORGOT_PASSWORD_SCHEMA }, forgotPassword)
  server.post(
    "/change-password",
    { onRequest: [server.auth], schema: CHANGE_PASSWORD_SCHEMA },
    changePassword
  )
  server.post("/refresh-token", { schema: REFRESH_TOKEN_SCHEMA }, refreshToken)
  server.get("/whoami", { onRequest: [server.auth], schema: WHOAMI_SCHEMA }, whoami)
  server.post("/verify/:uuid", { schema: VERIFY_SCHEMA }, verify)
}

export default authRoutes
