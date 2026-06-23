export const PANEL_COMPONENT_TYPES = [
  "comments",
  "information",
  "featured_gallery",
  "featured_artwork",
  "reference_sheet",
  "featured_character",
  "popular_character",
  "multiple_characters",
  "recent_artworks",
  "multiple_artworks",
  "popular_artwork",
  "multiple_galleries",
  "featured_listing",
  "recent_listings",
  "commission_queue",
] as const

export type PanelComponentType = (typeof PANEL_COMPONENT_TYPES)[number]

export const PANEL_SETTINGS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    html: { type: "string" },
    artworkId: { type: "string" },
    artworkIds: { type: "string" },
    characterSlug: { type: "string" },
    characterSlugs: { type: "string" },
    refSheetId: { type: "string" },
    folderId: { type: "string" },
    customTitle: { type: "string", maxLength: 120 },
    limit: { type: "string" },
  },
} as const

export const PANEL_POSITION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    row: { type: "integer", minimum: 1 },
    col: { type: "integer", minimum: 1 },
  },
  required: ["row", "col"],
} as const

export const SET_PANEL_BODY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    position: PANEL_POSITION_SCHEMA,
    component: {
      type: "string",
      enum: [...PANEL_COMPONENT_TYPES],
    },
    settings: PANEL_SETTINGS_SCHEMA,
  },
  required: ["position", "component"],
} as const
