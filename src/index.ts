import fastify from 'fastify';
import * as Dotenv from 'dotenv';
import fastifyCors from '@fastify/cors';
import connectDatabase from './utils/database';
import userRoutes from './routes/v1/Users/routes';
import authRoutes from './routes/v1/Auth/routes';


const app = async () => {
    Dotenv.config();

    // Initalize Database and Fastify
    await connectDatabase();
    const server = fastify({ logger: true });

    // Health Check
    server.get('/health', async () => {
        return { hello: 'world' };
    });

    // CORS
    server.register(fastifyCors, {
        origin: process.env.NODE_ENV === "production" ? process.env.MA_FRONTEND_URL : "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    });

    // Registering Routes
    server.register(userRoutes, { prefix: '/v1/user' })
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

app()