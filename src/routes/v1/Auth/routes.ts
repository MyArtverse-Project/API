import { FastifyInstance } from "fastify";
import { changePassword, forgotPassword, login, logout, refreshToken, register } from "./controllers";

async function authRoutes(server: FastifyInstance) {
    server.post("/login", login);
    server.post("/register", register);
    server.post("/logout", { onRequest: [server.auth] }, logout);
    server.post("/forgot-password", forgotPassword);
    server.post("/change-password", { onRequest: [server.auth] }, changePassword);
    server.post("/refresh-token", refreshToken);
} 

export default authRoutes;