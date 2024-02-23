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

async function authRoutes(server: FastifyInstance) {
  server.post("/login", login)
  server.post("/register", register)
  server.post("/logout", { onRequest: [server.auth] }, logout)
  server.post("/forgot-password", forgotPassword)
  server.post("/change-password", { onRequest: [server.auth] }, changePassword)
  server.post("/refresh-token", refreshToken)
  server.get("/whoami", { onRequest: [server.auth] }, whoami)
  server.post('/verify/:uuid', verify);
}

export default authRoutes
