import { buildApp } from "./app"

export const app = async () => {
  const server = await buildApp()

  // Starting server
  server.listen({ port: 8080 }, (err) => {
    if (err) {
      server.log.error(err)
      process.exit(1)
    }
  })

  return server
}

app()
