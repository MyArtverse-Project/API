interface GetCharacterParams {
  id?: string
  name?: string
  ownerHandle?: string
}

interface CreateCharacterBody {
  name: string
  nickname?: string
  visibility: "public" | "private" | "followers"
  /** @deprecated typo — use visibility */
  visiblility?: "public" | "private" | "followers"
  mainCharacter: boolean
  characterAvatar: string | null
}

interface EditCharacterBody {
  name?: string
  attributes?: {
    bio: string
    pronouns: "He/Him" | "She/Her" | "They/Them"
    customFields: { key: string; value: string }[]
    preferences: {
      likes: string[]
      dislikes: string[]
    }
  }
  nickname?: string
  visibility?: "public" | "private" | "followers"
  mainCharacter?: boolean
  species?: string
  isHybrid?: boolean
  avatarUrl?: string
  reference_sheet_url?: string | null
}

interface RefSheet {
  id?: string
  name: string
  description: string
  variants: {
    title: string
    artist: string
    description: string
    image: string
    primary: boolean
    colors: string[]
  }[]
}

export { GetCharacterParams, CreateCharacterBody, EditCharacterBody, RefSheet }
