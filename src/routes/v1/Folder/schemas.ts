import type { FastifySchema } from "fastify";

export const CREATE_FOLDER_SCHEMA: FastifySchema = {
    description: "Create a new folder",
    tags: ["Folder"],
    summary: "Create a new folder with the specified details",
    body: {
        type: "object",
        required: ["name", "contentType"],
        properties: {
            name: { type: "string" },
            contentType: { type: "string", enum: ["characters", "art", "artworks"] },
            parentId: { type: "string", nullable: true },
            color: { type: "string", nullable: true },
            characterId: { type: "string", nullable: true }
        }
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
                contentType: { type: "string" },
                userId: { type: "string" },
                parentId: { type: "string", nullable: true },
                color: { type: "string", nullable: true }
            }
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }
    }
};

export const GET_FOLDER_SCHEMA: FastifySchema = {
    description: "Get folder details",
    tags: ["Folder"],
    summary: "Retrieve details of a folder by its ID",
    params: {
        type: "object",
        required: ["folderId"],
        properties: {
            folderId: { type: "string" }
        }
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
                contentType: { type: "string" },
                userId: { type: "string" },
                parentId: { type: "string", nullable: true },
                color: { type: "string", nullable: true },
                children: { type: "array", items: { type: "object" } },
                characters: { type: "array", items: { type: "object" } },
                artworks: { type: "array", items: { type: "object" } }
            }
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }
    }
};

export const GET_FOLDER_BY_HANDLE_SCHEMA: FastifySchema = {
    description: "Get folders by user handle",
    tags: ["Folder"],
    summary: "Retrieve folders owned by a user identified by their handle",
    params: {
        type: "object",
        required: ["handle"],
        properties: {
            handle: { type: "string" }
        }
    },
    response: {
        200: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    contentType: { type: "string" },
                    userId: { type: "string" },
                    parentId: { type: "string", nullable: true },
                    color: { type: "string", nullable: true },
                    children: { type: "array", items: { type: "object" } },
                    characters: { type: "array", items: { type: "object" } },
                    artworks: { type: "array", items: { type: "object" } }
                }
            }
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }
    }
};

export const GET_FOLDER_RECURSIVELY_SCHEMA: FastifySchema = {
    description: "Get folder details recursively",
    tags: ["Folder"],
    summary: "Retrieve details of a folder and its nested children by its ID",
    params: {
        type: "object",
        required: ["folderId"],
        properties: {
            folderId: { type: "string" }
        }
    },
    response: {
        200: {
            type: "object",
            properties: {
                id: { type: "string" },
                name: { type: "string" },
                contentType: { type: "string" },
                userId: { type: "string" },
                parentId: { type: "string", nullable: true },
                color: { type: "string", nullable: true },
                children: { type: "array", items: { type: "object" } },
                characters: { type: "array", items: { type: "object" } },
                artworks: { type: "array", items: { type: "object" } }
            }
        },
        400: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }
    }
};

export const GET_CHARACTER_GALLERY_FOLDERS_SCHEMA: FastifySchema = {
    description: "Get gallery folders for a character",
    tags: ["Folder"],
    summary: "Retrieve art folders scoped to a character gallery",
    params: {
        type: "object",
        required: ["characterId"],
        properties: {
            characterId: { type: "string" }
        }
    },
    response: {
        200: {
            type: "array",
            items: { type: "object", additionalProperties: true }
        },
        403: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        },
        404: {
            type: "object",
            properties: {
                error: { type: "string" }
            }
        }
    }
};

export const DELETE_FOLDER_SCHEMA: FastifySchema = {
    description: "Delete a folder",
    tags: ["Folder"],
    summary: "Delete a folder owned by the authenticated user",
    params: {
        type: "object",
        required: ["folderId"],
        properties: {
            folderId: { type: "string" },
        },
    },
    response: {
        200: {
            type: "object",
            properties: {
                message: { type: "string" },
            },
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
                error: { type: "string" },
            },
        },
    },
};