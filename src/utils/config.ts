/** Shared URL helpers for local dev and production. */

/** Comma-separated extra origins for CORS during migration (optional). */
export const getCorsOrigins = (): string | string[] => {
  if (process.env.FRONTEND_ORIGINS) {
    return process.env.FRONTEND_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  }

  return getFrontendOrigin()
}

export const getFrontendOrigin = (): string => {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, "")
  }

  const http = process.env.MA_FRONTEND_HTTP ?? "http://"
  const domain = process.env.MA_FRONTEND_DOMAIN ?? "localhost"
  const port = process.env.MA_FRONTEND_PORT ?? "3000"

  if (port === "443" && http.startsWith("https")) {
    return `${http}${domain}`
  }
  if (port === "80" && http === "http://") {
    return `${http}${domain}`
  }

  return `${http}${domain}:${port}`
}

export const getCookieDomain = (): string => {
  return process.env.COOKIE_DOMAIN ?? "localhost"
}

export const getApiBaseUrl = (): string => {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, "")
  }

  const http = process.env.MA_API_HTTP ?? "http://"
  const domain = process.env.MA_API_DOMAIN ?? "localhost"
  const port = process.env.MA_API_PORT ?? "8081"

  if (port === "443" && http.startsWith("https")) {
    return `${http}${domain}`
  }
  if (port === "80" && http === "http://") {
    return `${http}${domain}`
  }

  return `${http}${domain}:${port}`
}

export const isLocalS3 = (): boolean => {
  return Boolean(process.env.S3_ENDPOINT)
}
