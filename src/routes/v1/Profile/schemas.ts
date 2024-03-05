import { FastifySchema } from "fastify"

export const ME_SCHEMA: FastifySchema = {
  description: "Get the current user's information",
  tags: ["User"],
  summary: "Fetches the details of the current user",
  response: {
    200: {
      description: "User Information",
      type: "object",
      properties: {
        id: { type: "string" },
        handle: { type: "string" },
        displayName: { type: "string" },
        bio: { type: "string" },
        avatarUrl: { type: "string" },
        bannerUrl: { type: "string" },
        dateRegistered: { type: "string", format: "date-time" },
        dateUpdated: { type: "string", format: "date-time" },
        hasArtistAccess: { type: "boolean" },
        hasBetaAccess: { type: "boolean" },
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              label: { type: "string" }
            }
          }
        },
        pronouns: { type: "string" },
        nationaility: { type: "string" },
        birthday: { type: "string", format: "date-time" }
      },
      404: {
        description: "User not found",
        type: "object",
        properties: {
          error: { type: "string" }
        }
      }
    }
  }
}

export const GET_PROFILE_SCHEMA: FastifySchema = {
  description: "Get a user's profile information by handle",
  tags: ["User"],
  summary: "Fetches a user's profile using their handle",
  params: {
    type: "object",
    required: ["handle"],
    properties: {
      handle: { type: "string" }
    }
  },
  response: {
    200: {
      description: "Profile Information",
      type: "object",
      properties: {
        id: { type: "string" },
        handle: { type: "string" },
        displayName: { type: "string" },
        bio: { type: "string" },
        avatarUrl: { type: "string" },
        bannerUrl: { type: "string" },
        dateRegistered: { type: "string", format: "date-time" },
        dateUpdated: { type: "string", format: "date-time" },
        hasArtistAccess: { type: "boolean" },
        hasBetaAccess: { type: "boolean" },
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              label: { type: "string" }
            }
          }
        },
        pronouns: { type: "string" },
        nationaility: { type: "string" },
        birthday: { type: "string", format: "date-time" }
      },
      404: {
        description: "Profile not found",
        type: "object",
        properties: {
          error: { type: "string" }
        }
      }
    }
  }
}
export const UPLOAD_PROFILE_BANNER_SCHEMA: FastifySchema = {
  description: "Upload a banner image for the user's profile",
  tags: ["User", "Upload"],
  summary: "Uploads a banner image for the current user's profile",
  body: {
    type: "object",
    properties: {
      file: { type: "string", format: "binary" }
    }
  },
  response: {
    200: {
      description: "Banner uploaded successfully",
      type: "object",
      properties: {
        message: { type: "string" },
        url: { type: "string" }
      }
    },
    400: {
      description: "No file uploaded",
      type: "object",
      properties: {
        message: { type: "string" }
      }
    },
    500: {
      description: "Error uploading file",
      type: "object",
      properties: {
        message: { type: "string" }
      }
    }
  }
}

export const UPLOAD_PROFILE_AVATAR_SCHEMA: FastifySchema = {
  description: "Upload an avatar image for the user's profile",
  tags: ["User", "Upload"],
  summary: "Uploads an avatar image for the current user's profile",
  body: {
    type: "object",
    properties: {
      file: { type: "string", format: "binary" }
    }
  },
  response: {
    200: {
      description: "Avatar uploaded successfully",
      type: "object",
      properties: {
        message: { type: "string" },
        url: { type: "string" }
      }
    },
    400: {
      description: "No file uploaded",
      type: "object",
      properties: {
        message: { type: "string" }
      }
    },
    500: {
      description: "Error uploading file",
      type: "object",
      properties: {
        message: { type: "string" }
      }
    }
  }
}
