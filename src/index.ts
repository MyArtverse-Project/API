/* eslint-disable @typescript-eslint/no-explicit-any */
import { S3Client } from "@aws-sdk/client-s3"
import { fastifyCookie, type FastifyCookieOptions } from "@fastify/cookie"
import fastifyCors from "@fastify/cors"
import fastifyJwt from "@fastify/jwt"
import multipart from "@fastify/multipart"
import swagger from "@fastify/swagger"
import swaggerUI from "@fastify/swagger-ui"
import * as dotenv from "dotenv"
import fastify from "fastify"
import nodemailer, { type SentMessageInfo } from "nodemailer"
import type { DataSource } from "typeorm"
import authRoutes from "./routes/v1/Auth/routes"
import { characterRoutes } from "./routes/v1/Characters/routes"
import profileRoutes from "./routes/v1/Profile/routes"
import verifyToken from "./utils/auth"
import connectDatabase from "./utils/database"
import { checkModAbovePermissions } from "./utils/permission"
import artRoutes from "./routes/v1/Art/routes"
import relationshipRoutes from "./routes/v1/Relationships/routes"
import StaffRoutes from "./routes/v1/Staff/routes"

declare module "fastify" {
  interface FastifyInstance {
    db: DataSource
    auth: any
    permissionAboveMod: any
    mailer: nodemailer.Transporter<SentMessageInfo>
    s3: S3Client
  }

  interface UserRequest extends FastifyRequest {
    user: {
      id: string
      profileId: string
    }
  }
}

const app = async () => {
  dotenv.config()

  // Initalize Database and Fastify
  const connection = await connectDatabase()
  const server = fastify({ logger: true })

  // S3
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT as string,
    region: process.env.AWS_DEFAULT_REGION as string,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
    },
    forcePathStyle: true
  })

  server.decorate("s3", s3)

  // DB + Fastify
  server.decorate("db", connection)
  // server.decorateRequest('db', connection);

  // Auth Decorator
  server.decorate("auth", verifyToken)

  // Permission Dectorator
  server.decorate("permissionAboveMod", checkModAbovePermissions)

  // Initialize Nodemailer
  const mailer = nodemailer.createTransport({
    host: process.env.SMTP_EMAIL_HOST,
    port: Number(process.env.SMTP_EMAIL_PORT),
    secure: process.env.NODE_ENV === "production" ? true : false
  })

  // Mailer Decorator
  server.decorate("mailer", mailer).addHook("onClose", () => mailer.close())

  // JWT
  server.register(fastifyJwt, {
    secret: String(process.env.MA_JWT_SECRET),
    cookie: { cookieName: "accessToken", signed: false }
  })

  // Cookie
  server.register(fastifyCookie, {
    secret: process.env.MA_COOKIE_SECRET
  } as FastifyCookieOptions)

  // CORS
  server.register(fastifyCors, {
    origin:
      `${process.env.MA_FRONTEND_HTTP}${process.env.MA_FRONTEND_DOMAIN}:${process.env.MA_FRONTEND_PORT}` ||
      "http://localhost:3000",
    credentials: true
  })

  // Multer
  server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB Limit
    }
  })

  // Health Check
  server.get("/health", async () => {
    return { status: "ok" }
  })

  // Swaggy Styff
  await server.register(swagger)
  await server.register(swaggerUI, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (_request, _reply, next) {
        next()
      },
      preHandler: function (_request, _reply, next) {
        next()
      }
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject
    },
    transformSpecificationClone: true
  })

  // Registering Routes
  server.get("/", () => {
    message: "Hello"
  })
  server.register(profileRoutes, { prefix: "/v1/user" })
  server.register(authRoutes, { prefix: "/v1/auth" })
  server.register(characterRoutes, { prefix: "/v1/character" })
  server.register(relationshipRoutes, { prefix: "/v1/relationship" })
  server.register(profileRoutes, { prefix: "/v1/profile" })
  server.register(artRoutes, { prefix: "/v1/art" })
  server.register(StaffRoutes, { prefix: "/v1/staff" })

  // Starting server
  server.listen(
    {
      port: Number(process.env.MA_PORT) || 8080,
      host: process.env.MA_HOST || "localhost"
    },
    (err, address) => {
      if (err) {
        server.log.error(err)
        process.exit(1)
      }

      server.log.info(`server listening on ${address}`)
    }
  )
}

app()
