import fastifyOauth2 from "@fastify/oauth2"
import dotenv from "dotenv"

dotenv.config()

// TODO: Add "x", "tiktok" to providers and oauthProviders arrays when they are implemented
export const providers = ["google", "facebook"]

export const oauthProviders = [
  {
    name: "google",
    config: {
      name: "googleOAuth",
      scope: ["profile", "email"],
      credentials: {
        client: {
          id: process.env.GOOGLE_CLIENT_ID,
          secret: process.env.GOOGLE_CLIENT_SECRET
        },
        auth: fastifyOauth2.GOOGLE_CONFIGURATION
      },
      startRedirectPath: "/v1/auth/google",
      callbackUri: process.env.GOOGLE_REDIRECT_URI
    }
  },
  {
    name: "facebook",
    config: {
      name: "facebookOAuth",
      scope: ["email", "public_profile"],
      credentials: {
        client: {
          id: process.env.FACEBOOK_CLIENT_ID,
          secret: process.env.FACEBOOK_CLIENT_SECRET
        },
        auth: fastifyOauth2.FACEBOOK_CONFIGURATION
      },
      startRedirectPath: "/v1/auth/facebook",
      callbackUri: process.env.FACEBOOK_REDIRECT_URI
    }
  },
  // {
  //   name: "x",
  //   config: {
  //     name: "xOAuth",
  //     scope: ["tweet.read", "users.read", "offline.access"], // Adjust scopes as needed
  //     credentials: {
  //       client: {
  //         id: process.env.TWITTER_CLIENT_ID,
  //         secret: process.env.TWITTER_CLIENT_SECRET
  //       },
  //       auth: {
  //         authorizeHost: "https://api.x.com",
  //         authorizePath: "/oauth/authorize",
  //         tokenHost: "https://api.x.com",
  //         tokenPath: "/2/oauth2/token",
  //       }
  //     },
  //     startRedirectPath: "/v1/auth/x",
  //     callbackUri: process.env.TWITTER_REDIRECT_URI
  //   }
  // },
  // {
  //   name: "tiktok",
  //   config: {
  //     name: "tiktokOAuth",
  //     scope: ["user.info.basic", "user.info.email"],
  //     credentials: {
  //       client: {
  //         id: process.env.TIKTOK_CLIENT_ID,
  //         secret: process.env.TIKTOK_CLIENT_SECRET
  //       },
  //       auth: {
  //         authorizeHost: "https://open-api.tiktok.com",
  //         authorizePath: "/platform/oauth/connect/",
  //         tokenHost: "https://open-api.tiktok.com",
  //         tokenPath: "/oauth/access_token/"
  //       }
  //     },
  //     startRedirectPath: "/v1/auth/tiktok",
  //     callbackUri: process.env.TIKTOK_REDIRECT_URI
  //   }
  // }
]
