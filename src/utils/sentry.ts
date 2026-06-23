import * as Sentry from "@sentry/node"
import type { FastifyInstance } from "fastify"

export const isSentryEnabled = (): boolean => Boolean(process.env.SENTRY_DSN)

export const initSentry = (): void => {
  if (!isSentryEnabled()) {
    console.log("Sentry disabled (SENTRY_DSN not set)")
    return
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.1"),
    sendDefaultPii: false,
  })

  console.log(
    `Sentry enabled (environment: ${process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development"})`
  )
}

export const setupFastifySentry = (server: FastifyInstance): void => {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.setupFastifyErrorHandler(server)
}

export const captureException = (error: unknown): void => {
  if (!isSentryEnabled()) {
    return
  }

  Sentry.captureException(error)
}
