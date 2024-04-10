import tap from 'tap'
import { faker } from '@faker-js/faker'
import { buildApp } from '../../../../app'
import { ImportMock } from 'ts-mock-imports'
import * as AuthServices from '../services'

tap.test("POST `/v1/auth/register` - Sucessfully create a user", async () => {
    const username = faker.internet.userName()
    const email = faker.internet.email()
    const password = faker.internet.password()
    const fastify = await buildApp()

    const stub = ImportMock.mockFunction(AuthServices, 'createUser', {
        username,
        email,
        password
    })

    const response = await fastify.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
            username,
            email,
            password
        }
    })

    tap.equal(response.statusCode, 201, "Status code is 201")
    tap.same(response.json(), { username, email }, "Response is correct")
})

tap.test("Post `/v1/auth/register` - Fail to create a user", async () => {
})



