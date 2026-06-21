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
import authRoutes from "./routes/v1/Auth/routes"
import { createMailer, type Mailer } from "./utils/mailer"
import { characterRoutes } from "./routes/v1/Characters/routes"
import profileRoutes from "./routes/v1/Profile/routes"
import { authMiddleware, optionalAuthMiddleware } from "./utils/auth"
import connectDatabase from "./utils/database"
import { ensureS3Bucket } from "./utils/images"
import { checkModAbovePermissions } from "./utils/permission"
import { getCorsOrigins } from "./utils/config"
import { createS3Client } from "./utils/s3"
import artRoutes from "./routes/v1/Art/routes"
import relationshipRoutes from "./routes/v1/Relationships/routes"
import StaffRoutes from "./routes/v1/Staff/routes"
import { oauthProviders } from "./config/oauth"
import fastifyOauth2, { OAuth2Namespace } from "@fastify/oauth2"
import fastifySession from "@fastify/session"
import folderRoutes from "./routes/v1/Folder/routes"
import dashboardRoutes from "./routes/v1/Dashboard/routes"
import { DataSource } from "typeorm"
import { generalRoutes } from "./routes/v1/General/routes"

declare module "fastify" {
  interface FastifyInstance {
    db: DataSource
    auth: any
    permissionAboveMod: any
    optionalAuth: any
    mailer: Mailer
    s3: S3Client
  }

  interface UserRequest extends FastifyRequest {
    user: {
      id: string
      profileId: string
    }
  }

  interface FastifyInstance {
    facebookOAuth2: OAuth2Namespace;
    googleOAuth: OAuth2Namespace;
  }
}

const app = async () => {
  dotenv.config()

  // Initalize Database and Fastify
  const connection = await connectDatabase()
  const server = fastify({ logger: true })

  // cookie
  server.register(fastifyCookie, {
    secret: process.env.MA_COOKIE_SECRET
  } as FastifyCookieOptions)

  server.register(fastifySession, {
    secret: process.env.MA_SESSION_SECRET as string
  })

  // S3
  const s3 = createS3Client()

  server.decorate("s3", s3)
  await ensureS3Bucket(s3)

  // DB + Fastify
  server.decorate("db", connection)
  // server.decorateRequest('db', connection);

  // Auth Decorator
  server.decorate("auth", authMiddleware)
  server.decorate("optionalAuth", optionalAuthMiddleware)

  // Register all OAuth providers
  oauthProviders.forEach(({ name, config }) => {
    // @ts-expect-error
    server.register(fastifyOauth2, config)
    console.log(`OAuth provider registered: ${name}`)
  })

  // Permission Dectorator
  server.decorate("permissionAboveMod", checkModAbovePermissions)

  // Initialize Resend mailer
  const mailer = createMailer()
  server.decorate("mailer", mailer)

  // JWT
  server.register(fastifyJwt, {
    secret: String(process.env.MA_JWT_SECRET),
    cookie: { cookieName: "accessToken", signed: false }
  })

  // CORS
  server.register(fastifyCors, {
    origin: getCorsOrigins(),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
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
  server.register(folderRoutes, { prefix: "/v1/folders" })
  server.register(dashboardRoutes, { prefix: "/v1/dashboard" })
  server.register(artRoutes, { prefix: "/v1/art" })
  server.register(generalRoutes, { prefix: "/v1" })
  server.register(StaffRoutes, { prefix: "/v1/staff" })

  // Starting server
  server.listen(
    {
      port: Number(process.env.MA_PORT) || 8080,
      host: process.env.MA_INTERFACE || "localhost"
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
