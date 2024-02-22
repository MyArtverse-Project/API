import fastifyCors from '@fastify/cors';
import * as Dotenv from 'dotenv';
import fastify from 'fastify';
import { DataSource } from 'typeorm';
import authRoutes from './routes/v1/Auth/routes';
import profileRoutes from './routes/v1/Profile/routes';
import verifyToken from './utils/auth';
import connectDatabase from './utils/database';
import { FastifyCookieOptions } from '@fastify/cookie';
import { User } from './models/Users';
import fastifyJwt, { UserType } from '@fastify/jwt';

    

declare module 'fastify' {
    interface FastifyInstance {
        db: DataSource;
        auth: any
    }

    interface FastifyRequest {
        user: UserType;
    }
}

const app = async () => {
    Dotenv.config();

    // Initalize Database and Fastify
    const connection = await connectDatabase();
    const server = fastify({ logger: true });

    // DB + Fastify
    server.decorate('db', connection);
    // server.decorateRequest('db', connection);

    // Auth Decorator
    server.decorate("auth", verifyToken)

    // JWT
    server.register(fastifyJwt, { secret: String(process.env.MA_JWT_SECRET) });

    // Cookie
    server.register(require('@fastify/cookie'), {
        secret: process.env.MA_COOKIE_SECRET,
        parseOptions: {}
    } as FastifyCookieOptions)


    // CORS
    server.register(fastifyCors, {
        origin: process.env.NODE_ENV === "production" ? process.env.MA_FRONTEND_URL : "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    });

    // Health Check
    server.get('/health', async () => {
        return { hello: 'world' };
    });

    // Registering Routes
    server.register(profileRoutes, { prefix: '/v1/user' })
    server.register(authRoutes, { prefix: '/v1/auth' })

    // Starting server
    server.listen({
        port: Number(process.env.MA_PORT) || 8080,
        host: process.env.MA_HOST || "localhost",
    }, (err, address) => {
        if (err) {
            server.log.error(err);
            process.exit(1);
        }
        console.log(`server listening on ${address}`);
    });
}

app();