import bcrypt from "bcrypt";
import { FastifyReply, FastifyRequest } from "fastify";
import { Authentication } from "../../../models/Auth";

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

    const token = request.server.jwt.sign({ id: user.id });

    // Return the token
    return reply.code(200).setCookie('token', token, {
        path: '/',
        domain: 'localhost',
        httpOnly: true,
        secure: false,
        sameSite: 'none'
    }).send({ token: token });
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
    return reply.code(200).clearCookie('token').send({ message: "Logged out" });
}

export const forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO
    return { hello: "world" };
}

export const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
    // TODO
    return { hello: "world" };
}

