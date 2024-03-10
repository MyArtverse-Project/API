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

export const GET_CHARACTER_BY_NAME_SCHEMA: FastifySchema = {
  description: "Retrieving character details by Name",
  tags: ["Character"],
  summary:
    "Fetches detailed information about a specific character by their unique identifier",
  params: {
    type: "object",
    required: ["name", "ownerHandle"],
    properties: {
      name: { type: "string", description: "The name of the character" },
      ownerHandle: {
        type: "string",
        description: "The handler of the owner"
      }
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
        attributes: {
          type: "object",
          properties: {
            preferences: {
              type: "object",
              properties: {
                likes: { type: "array", items: { type: "string" } },
                dislikes: { type: "array", items: { type: "string" } }
              }
            },
            custom_fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  property: { type: "string" },
                  value: { type: "string" }
                }
              }
            },
            gender: { type: "string" },
            pronouns: { type: "string" }
          }
        }
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

export const CREATE_CHARACTER_SCHEMA: FastifySchema = {
  description: "Create a new character with specified attributes",
  tags: ["Character"],
  summary: "Creates a new character for the authenticated user",
  body: {
    type: "object",
    required: [
      "name",
      "visible",
      "nickname",
      "species",
      "pronouns",
      "gender",
      "bio",
      "likes",
      "dislikes",
      "is_hybrid"
    ],
    properties: {
      name: { type: "string", description: "Character's name" },
      visible: {
        type: "boolean",
        description: "Whether the character is visible to others"
      },
      nickname: { type: "string", description: "Character's nickname" },
      mainCharacter: {
        type: "boolean",
        description: "Whether this character is the user's main character"
      },
      species: { type: "string", description: "Character's species" },
      pronouns: { type: "string", description: "Character's pronouns" },
      gender: { type: "string", description: "Character's gender" },
      bio: { type: "string", description: "Character's biography" },
      likes: {
        type: "array",
        items: { type: "string" },
        description: "List of things the character likes"
      },
      dislikes: {
        type: "array",
        items: { type: "string" },
        description: "List of things the character dislikes"
      },
      is_hybrid: {
        type: "boolean",
        description: "Whether the character is a hybrid of species"
      }
    }
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
            visible: { type: "boolean" },
            nickname: { type: "string" },
            species: { type: "string" }
          }
        }
      },
      description: "The created character"
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string", description: "No user found." }
      }
    }
  }
}
