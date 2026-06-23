import type { DataSource } from "typeorm"
import User, { Role } from "../models/Users"

/** Hard ceiling for multipart parsing (must be >= highest role/user limit). */
export const MAX_MULTIPART_BYTES = 100 * 1024 * 1024

export const ROLE_UPLOAD_LIMIT_BYTES: Record<Role, number> = {
  [Role.USER]: 10 * 1024 * 1024,
  [Role.MODERATOR]: 25 * 1024 * 1024,
  [Role.ADMIN]: 50 * 1024 * 1024,
  [Role.DEVELOPER]: 100 * 1024 * 1024,
}

/** Extra allowance for verified artists on the default user role. */
export const ARTIST_UPLOAD_BONUS_BYTES = 5 * 1024 * 1024

export class UploadLimitError extends Error {
  readonly limitBytes: number

  constructor(limitBytes: number) {
    super(`File exceeds upload limit of ${formatUploadLimit(limitBytes)}`)
    this.name = "UploadLimitError"
    this.limitBytes = limitBytes
  }
}

export function getRoleUploadLimitBytes(role: Role): number {
  return ROLE_UPLOAD_LIMIT_BYTES[role] ?? ROLE_UPLOAD_LIMIT_BYTES[Role.USER]
}

export type UploadLimitUser = Pick<User, "role" | "uploadLimitBytes" | "hasArtistAccess">

export function getUploadLimitBytes(user: UploadLimitUser): number {
  if (user.uploadLimitBytes != null && user.uploadLimitBytes > 0) {
    return Math.min(user.uploadLimitBytes, MAX_MULTIPART_BYTES)
  }

  let limit = getRoleUploadLimitBytes(user.role)

  if (user.hasArtistAccess && user.role === Role.USER) {
    limit += ARTIST_UPLOAD_BONUS_BYTES
  }

  return Math.min(limit, MAX_MULTIPART_BYTES)
}

export function formatUploadLimit(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return Number.isInteger(mb) ? `${mb}MB` : `${mb.toFixed(1)}MB`
  }

  return `${Math.round(bytes / 1024)}KB`
}

export async function loadUserUploadLimit(
  db: DataSource,
  profileId: string
): Promise<number | null> {
  const user = await db.getRepository(User).findOne({
    where: { id: profileId },
    select: {
      id: true,
      role: true,
      uploadLimitBytes: true,
      hasArtistAccess: true,
    },
  })

  if (!user) return null
  return getUploadLimitBytes(user)
}

export function withEffectiveUploadLimit<T extends UploadLimitUser>(user: T) {
  return {
    ...user,
    effectiveUploadLimitBytes: getUploadLimitBytes(user),
  }
}
