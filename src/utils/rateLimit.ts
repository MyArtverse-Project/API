export const strictAuthRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: "1 minute",
  },
} as const

export const changePasswordRateLimit = {
  rateLimit: {
    max: 5,
    timeWindow: "1 minute",
  },
} as const

export const refreshRateLimit = {
  rateLimit: {
    max: 20,
    timeWindow: "1 minute",
  },
} as const

export const oauthRateLimit = {
  rateLimit: {
    max: 10,
    timeWindow: "1 minute",
  },
} as const
