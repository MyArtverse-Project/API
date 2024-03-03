/* eslint-disable @typescript-eslint/no-explicit-any */
import fastifyCors from "@fastify/cors"
import * as dotenv from "dotenv"
import fastify from "fastify"
import { DataSource } from "typeorm"
import authRoutes from "./routes/v1/Auth/routes"
import profileRoutes from "./routes/v1/Profile/routes"
import verifyToken from "./utils/auth"
import connectDatabase from "./utils/database"
import nodemailer, { type SentMessageInfo } from "nodemailer"
import { characterRoutes } from "./routes/v1/Characters/routes"
import multipart from "@fastify/multipart"
import { S3Client } from "@aws-sdk/client-s3"
import { type FastifyCookieOptions, fastifyCookie } from "@fastify/cookie"
import fastifyJwt from "@fastify/jwt"
import { uploadToS3 } from "./utils"
import { User, Image } from "./models"

declare module "fastify" {
  interface FastifyInstance {
    db: DataSource
    auth: any
    mailer: nodemailer.Transporter<SentMessageInfo>
    s3: S3Client
  }

  interface UserRequest extends FastifyRequest {
    user: {
      id: number
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

  // Upload Route
  server.post("/upload", { preHandler: [server.auth] }, async (request, reply) => {
    const user = await request.server.db.getRepository(User).findOne({
      where: { id: Number((request.user as { id: string }).id) }
    })
    if (!user) return reply.code(401).send({ message: "Unauthorized" })

    // Get the file from the request
    const data = await request.file()
    if (!data) {
      return reply.code(400).send({ message: "No file uploaded" })
    }

    const { file, filename, mimetype } = data
    const uploadResult = await uploadToS3(request.server.s3, file, filename, mimetype)

    // TODO: Modify the image as needed for art protection with password protected filter
    if (!uploadResult) {
      return reply.code(500).send({ message: "Error uploading file" })
    }

    const url =
      await `https://${process.env.S3_BUCKET}.${process.env.S3_ENDPOINT}/${filename}`

    const image = await request.server.db
      .getRepository(Image)
      .save({ url: url, altText: filename })

    return reply.code(200).send({ message: "Art uploaded", url: image.url })
  })

  // Registering Routes
  server.register(profileRoutes, { prefix: "/v1/user" })
  server.register(authRoutes, { prefix: "/v1/auth" })
  server.register(characterRoutes, { prefix: "/v1/character" })
  server.register(profileRoutes, { prefix: "/v1/profile" })

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
