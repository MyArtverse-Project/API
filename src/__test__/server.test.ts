import type { FastifyInstance } from 'fastify'
import tap from 'tap'
import { app as server } from '..'
import { buildApp } from '../app';

let app: FastifyInstance;

tap.beforeEach(async () => {
    app = await buildApp()
})

tap.afterEach(async () => {
    await app.close()
})

tap.test('GET /health', async (t) => {
    const response = await app.inject({
        method: 'GET',
        url: '/health'
    })

    t.equal(response.statusCode, 200, "/health returns 200")
    t.same(response.json(), { status: "ok" }, "/health returns { status: 'ok' }")
})