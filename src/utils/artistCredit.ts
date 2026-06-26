import type { DataSource, EntityManager } from "typeorm"
import RefSheet from "../models/RefSheet"
import User from "../models/Users"

export type ArtistCreditPayload = {
  platform: string
  handle?: string
  url?: string
  mavUserId?: string
  avatarUrl?: string | null
}

type Db = DataSource | EntityManager

function clearRefSheetArtist(refSheet: RefSheet) {
  refSheet.artistUser = null
  refSheet.artistPlatform = null
  refSheet.artistExternalHandle = null
  refSheet.artistUrl = null
  refSheet.artistExternalAvatarUrl = null
  refSheet.artistExternal = null
}

export async function applyRefSheetArtistCredit({
  refSheet,
  db,
  currentUser,
  userAsArtist,
  artistCredit,
}: {
  refSheet: RefSheet
  db: Db
  currentUser: User
  userAsArtist?: boolean
  artistCredit?: ArtistCreditPayload | null
}) {
  if (userAsArtist) {
    refSheet.artistUser = currentUser
    refSheet.artistPlatform = "mav"
    refSheet.artistExternalHandle = currentUser.handle
    refSheet.artistExternalAvatarUrl = currentUser.avatarUrl ?? null
    refSheet.artistUrl = null
    refSheet.artistExternal = null
    return
  }

  if (!artistCredit) {
    clearRefSheetArtist(refSheet)
    return
  }

  const platform = artistCredit.platform?.trim()
  if (!platform) {
    clearRefSheetArtist(refSheet)
    return
  }

  if (platform === "url") {
    const url = artistCredit.url?.trim()
    if (!url) {
      clearRefSheetArtist(refSheet)
      return
    }

    refSheet.artistUser = null
    refSheet.artistPlatform = "url"
    refSheet.artistUrl = url
    refSheet.artistExternalHandle = null
    refSheet.artistExternalAvatarUrl = null
    refSheet.artistExternal = url
    return
  }

  if (platform === "mav") {
    const userRepo = db.getRepository(User)
    let mavArtist: User | null = null

    if (artistCredit.mavUserId) {
      mavArtist = await userRepo.findOne({ where: { id: artistCredit.mavUserId } })
    }

    const handle = artistCredit.handle?.trim().replace(/^@+/, "")
    if (!mavArtist && handle) {
      mavArtist = await userRepo.findOne({ where: { handle } })
    }

    refSheet.artistUser = mavArtist
    refSheet.artistPlatform = "mav"
    refSheet.artistExternalHandle = mavArtist?.handle ?? handle ?? null
    refSheet.artistExternalAvatarUrl =
      mavArtist?.avatarUrl ?? artistCredit.avatarUrl ?? null
    refSheet.artistUrl = null
    refSheet.artistExternal = refSheet.artistExternalHandle
    return
  }

  const handle = artistCredit.handle?.trim().replace(/^@+/, "")
  if (!handle) {
    clearRefSheetArtist(refSheet)
    return
  }

  refSheet.artistUser = null
  refSheet.artistPlatform = platform
  refSheet.artistExternalHandle = handle
  refSheet.artistExternalAvatarUrl = artistCredit.avatarUrl ?? null
  refSheet.artistUrl = null
  refSheet.artistExternal = handle
}
