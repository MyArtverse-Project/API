import type { FastifySchema } from "fastify"

export const GET_CHARACTER_BY_ID_SCHEMA: FastifySchema = {
  description: "Retrieving character details by ID",
  tags: ["Character"],
  summary:
    "Fetches detailed information about a specific character by their unique identifier",
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "string", description: "The unique identifier of the character" }
    }
  },
  response: {
    200: {
      type: "object",
      description: "Character details successfully retrieved",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        species: { type: "string" },
        bio: { type: "string", nullable: true }
      }
    },
    404: {
      type: "object",
      description: "Character not found",
      properties: {
        error: { type: "string" }
      }
    },
    400: {
      type: "object",
      description: "Invalid request parameters",
      properties: {
        error: { type: "string" }
      }
    }
  }
}

// export const GET_CHARACTER_BY_NAME_SCHEMA: FastifySchema = {
//   description: "Retrieving character details by Name",
//   tags: ["Character"],
//   summary:
//     "Fetches detailed information about a specific character by their unique identifier",
//   params: {
//     type: "object",
//     required: ["name", "ownerHandle"],
//     properties: {
//       name: { type: "string", description: "The name of the character" },
//       ownerHandle: {
//         type: "string",
//         description: "The handler of the owner"
//       }
//     }
//   },
//   response: {
//     200: {
//       type: "object",
//       description: "Character details successfully retrieved",
//       properties: {
//         id: { type: "string" },
//         name: { type: "string" },
//         species: { type: "string" },
//         mainCharacter: { type: "boolean" },
//         attributes: {
//           type: "object",
//           properties: {
//             preferences: {
//               type: "object",
//               properties: {
//                 likes: { type: "array", items: { type: "string" } },
//                 dislikes: { type: "array", items: { type: "string" } }
//               }
//             },
//             custom_fields: {
//               type: "array",
//               items: {
//                 type: "object",
//                 properties: {
//                   property: { type: "string" },
//                   value: { type: "string" }
//                 }
//               }
//             },
//             gender: { type: "string" },
//             pronouns: { type: "string" }
//           }
//         }
//       }
//     },
//     404: {
//       type: "object",
//       description: "Character not found",
//       properties: {
//         error: { type: "string" }
//       }
//     },
//     400: {
//       type: "object",
//       description: "Invalid request parameters",
//       properties: {
//         error: { type: "string" }
//       }
//     }
//   }
// }

export const CREATE_CHARACTER_SCHEMA: FastifySchema = {
  description: "Create a new character with specified attributes",
  tags: ["Character"],
  summary: "Creates a new character for the authenticated user",
  body: {
    type: "object",
    required: ["name", "visibility", "mainCharacter", "characterAvatar"],
    properties: {
      name: { type: "string", description: "Character's name" },
      visibility: {
        type: "string",
        enum: ["public", "private", "followers"],
        description: "Who can view this character",
      },
      nickname: { type: "string", description: "Character's nickname" },
      mainCharacter: {
        type: "boolean",
        description: "Whether this character is the user's main character",
      },
      characterAvatar: {
        type: ["string", "null"],
        description: "Avatar image URL",
      },
    },
  },
  response: {
    200: {
      type: "object",
      properties: {
        character: {
          type: "object",
          properties: {
            id: { type: "string", description: "The UUID of the created character" },
            name: { type: "string" },
            slug: { type: "string" },
            safename: { type: "string" },
            visibility: { type: "string" },
            nickname: { type: ["string", "null"] },
            avatarUrl: { type: ["string", "null"] },
            mainCharacter: { type: "boolean" },
          },
        },
      },
      description: "The created character",
    },
    400: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string", description: "No user found." },
      },
    },
    500: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
    },
  },
}
