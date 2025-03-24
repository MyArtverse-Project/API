import { FastifySchema } from "fastify"

export const GET_USER_DASHBOARD_PANELS_SCHEMA: FastifySchema = {
  summary: "Get user panels",
  description: "Fetches the dashboard panels for the authenticated user",
  tags: ["Dashboard"],
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: { type: "string" },
          position: {
            type: "object",
            properties: {
              row: { type: "integer" },
              col: { type: "integer" },
            },
            required: ["row", "col"],
          },
          settings: {
            type: "object",
            properties: {
              html: { type: "string" },
            }
          },
        },
        required: ["id", "type", "position", "settings"],
      },
    },
    404: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
    },
  },
}

export const SET_HTML_PANEL_SCHEMA: FastifySchema = {
  summary: "Set custom HTML panel",
  description: "Creates or updates a custom HTML panel for the authenticated user",
  tags: ["Dashboard"],
  body: {
    type: "object",
    properties: {
      html: { type: "string" },
    },
    required: ["html"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        position: {
          type: "object",
          properties: {
            row: { type: "integer" },
            col: { type: "integer" },
          },
        },
        settings: {
          type: "object",
          properties: {
            html: { type: "string" },
          },
          required: ["html"],
        },
      },
      required: [],
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
}

export const SET_PANEL_SCHEMA: FastifySchema = {
  summary: "Set a new panel",
  description: "Adds a new panel to the user's dashboard",
  tags: ["Dashboard"],
  body: {
    type: "object",
    properties: {
      position: {
        type: "object",
        properties: {
          row: { type: "integer" },
          col: { type: "integer" },
        },
        required: ["row", "col"],
      },
      component: { type: "string", enum: ["comments", "information"] },
    },
    required: ["position", "component"],
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        position: {
          type: "object",
          properties: {
            row: { type: "integer" },
            col: { type: "integer" },
          },
        },
        settings: { type: "object" },
      },
      required: [],
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
}
