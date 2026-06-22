import { FastifySchema } from "fastify"
import {
  PANEL_SETTINGS_SCHEMA,
  SET_PANEL_BODY_SCHEMA,
} from "./panelTypes"

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
          settings: PANEL_SETTINGS_SCHEMA,
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
  description: "Adds or updates a panel on the user's dashboard",
  tags: ["Dashboard"],
  body: SET_PANEL_BODY_SCHEMA,
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

export const SET_CHARACTER_PANEL_SCHEMA: FastifySchema = {
  summary: "Set a character dashboard panel",
  description: "Adds or updates a panel on a character dashboard",
  tags: ["Dashboard"],
  body: SET_PANEL_BODY_SCHEMA,
  response: SET_PANEL_SCHEMA.response,
}
