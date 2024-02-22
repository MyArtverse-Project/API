import bcrypt from "bcrypt";
import { FastifyReply, FastifyRequest } from "fastify";
import { Authentication } from "../../../models/Auth";

export const refreshToken = async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = request.cookies;
    if (!refreshToken) {
        return reply.code(401).send({ error: "Unauthorized" });
    }
    try {
        const payload = await request.server.jwt.verify(refreshToken) as any;
        if (!payload) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        const user = await request.server.db.getRepository(Authentication).findOne({ where: { id: payload.id } });
        if (!user) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        const accessToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "10m" });
        return reply.code(200).setCookie('accessToken', accessToken, {
            path: '/',
            domain: 'localhost',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' ? true : false,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
        }).send({ accessToken });
    } catch (error) {
        return reply.code(401).send({ error: "Unauthorized" });
    }
}

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email: string, password: string };
    if (!body.email || !body.password) {
        return reply.code(400).send({ error: "Email and password are required" });
    }
    const { email, password } = body;

    // Check if email exists
    let user = await request.server.db.getRepository(Authentication).findOne({ where: { email: email } });
    if (!user) {
        return reply.code(400).send({ error: "Invalid email or password" });
    }

    // Check if password is correct
    if (!bcrypt.compareSync(password, user.password)) {
        return reply.code(400).send({ error: "Invalid email or password" });
    }

    const accessToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "10m" });
    const refreshToken = request.server.jwt.sign({ id: user.id }, { expiresIn: "7d" });

    // Return the token
    return reply.code(200).setCookie('accessToken', accessToken, {
        path: '/',
        domain: 'localhost',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }).setCookie('refreshToken', refreshToken, {
        path: '/',
        domain: 'localhost',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }).send({ accessToken: accessToken, refreshToken: refreshToken });
}

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email: string, password: string };
    if (!body.email || !body.password) {
        return reply.code(400).send({ error: "Email and password are required" });
    }
    const { email, password } = body;

    // Check if email is already in use
    let user = await request.server.db.getRepository(Authentication).findOne({ where: { email: email } });
    if (user) {
        return reply.code(400).send({ error: "Email already in use" });
    }

    // Hash the password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert it onto the database
    const data = await request.server.db.getRepository(Authentication).insert({
        email: email,
        password: hashedPassword
    });

    // If there was an error, return a 500
    if (!data) {
        return reply.code(500).send({ error: "Error creating user" });
    }

    // Return the token
    return reply.code(201).send({ email });
}

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).clearCookie('accessToken').clearCookie('refreshToken').send({ message: "Logged out" });
}

export const forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO
    return { hello: "world" };
}

export const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { newPassword: string, userId: number };
    if (!body.newPassword) {
        return reply.code(400).send({ error: "New password is required" });
    }
    const { newPassword, userId } = body;
    let user = await request.server.db.getRepository(Authentication).findOne({ where: { id: userId } });
    if (!user) {
        return reply.code(400).send({ error: "User not found" });
    }
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedPassword;
    await request.server.db.getRepository(Authentication).save(user);
    return reply.code(200).send({ message: "Password changed" });
}

