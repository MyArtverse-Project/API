interface GetCharacterParams {
  id?: string
  name?: string
  ownerHandle?: string
}

interface CreateCharacterBody {
  name: string
  nickname: string
  visiblility: "public" | "private" | "followers"
  mainCharacter: boolean
  characterAvatar: string
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
  refSheetName: string
  colors: string[]
  variants: {
    name: string
    url: string
    active: boolean
    nsfw: boolean
  }[]
}

export { GetCharacterParams, CreateCharacterBody, EditCharacterBody, RefSheet }