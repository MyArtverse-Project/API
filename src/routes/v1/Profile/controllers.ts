import type { FastifyReply, FastifyRequest } from "fastify"
import { Character, Image, User } from "../../../models"
import { Comment } from "../../../models"
import { uploadToS3 } from "../../../utils"
import {
  formatUploadLimit,
  loadUserUploadLimit,
  UploadLimitError,
  withEffectiveUploadLimit,
} from "../../../utils/uploadLimits"
import { DataSource, ILike, IsNull } from "typeorm"
import { sendMassNotification, sendNotification } from "../../../utils/notification"
import { CommissionStatus, Role } from "../../../models/Users"

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      folders: {
        characters: true,
        artworks: true,
        children: {
          characters: true,
          artworks: true,

        }
      },
      characters: true,
      favoriteCharacters: true,
      followers: {
        follower: true,
        following: true

      },
      following: {
        follower: true,
        following: true
      },
      notifications: {
        sender: true,
        user: true,
        comment: true,
        artwork: true
      }
    }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  if (!userData.characters) userData.characters = []
  return reply.code(200).send(withEffectiveUploadLimit(userData))
}

export const updateProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { avatarLink, handle, displayName, pronouns } = request.body as {
    displayName: string
    handle: string
    pronouns: string
    avatarLink: string
  }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.displayName = displayName || userData.displayName
  userData.pronouns = pronouns || userData.pronouns
  userData.handle = handle || userData.handle
  userData.avatarUrl = avatarLink || userData.avatarUrl

  const result = await request.server.db.getRepository(User).save(userData)

  if (!result) {
    return reply.code(500).send({ error: "Error updating profile" })
  }

  return reply.code(200).send({ message: "Updated" })
}

export const updateContentPreferences = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user as { id: string; profileId: string }
  const { showNsfw, nsfwDisplayMode } = request.body as {
    showNsfw?: boolean
    nsfwDisplayMode?: "blur" | "show"
  }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  const current = userData.contentPreferences ?? {
    showNsfw: false,
    nsfwDisplayMode: "blur" as const,
  }

  if (typeof showNsfw === "boolean") {
    current.showNsfw = showNsfw
  }
  if (nsfwDisplayMode === "blur" || nsfwDisplayMode === "show") {
    current.nsfwDisplayMode = nsfwDisplayMode
  }

  userData.contentPreferences = current
  await request.server.db.getRepository(User).save(userData)

  return reply.code(200).send({ contentPreferences: current })
}

export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const { handle } = request.params as { handle: string }

  const profile = await request.server.db.getRepository(User).findOne({
    where: {
      handle: handle
    },
    relations: {
      notifications: true,
      folders: {
        characters: true,
        artworks: true,
        children: {
          characters: true,
          artworks: true
        }
      },
      favoriteCharacters: true,
      followers: {
        follower: true,
        following: true
      },
      following: true
    }
  })

  if (!profile) return reply.code(404).send({ error: "Profile not found" })

  const characters = await request.server.db.getRepository(Character).find({
    where: {
      owner: {
        id: profile.id
      }
    }
  })

  const comments = await request.server.db.getRepository(Comment).find({
    where: { user: { handle }, parentComment: IsNull() },
    relations: {
      author: true,
      user: true
    },
    order: { createdAt: "DESC" }
  })

  for (const comment of comments) {
    comment.replies = await recursivelyGetReplies(comment.id, request.server.db)
  }

  profile.views += 1
  await request.server.db.getRepository(User).save(profile)

  return reply.code(200).send({ ...profile, characters, comments: comments })
}

export const commentProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { handle } = request.params as { handle: string }
  const { content, parentCommentId } = request.body as { content: string, parentCommentId?: string }

  if (!content) {
    return reply.code(400).send({ error: "No content provided" })
  }

  const profile = await request.server.db.getRepository(User).findOne({
    where: { handle: handle }
  })

  const author = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!profile || !author) {
    return reply.code(404).send({ error: "Profile not found" })
  }

  if (parentCommentId) {
    const parentComment = await request.server.db.getRepository(Comment).findOne({
      where: { id: parentCommentId },
    });

    if (!parentComment) {
      return reply.code(404).send({ error: "Parent comment not found" })
    }
  }

  const comment = await request.server.db.getRepository(Comment).save({
    content: content,
    author: author,
    user: profile,
    parentComment: parentCommentId ? { id: parentCommentId } : undefined,
  })

  if (!comment) {
    return reply.code(500).send({ error: "Error commenting" })
  }

  await sendNotification(request.server.db, profile, "%user% commented on your profile", author, undefined, comment)

  return reply.code(200).send({ message: "Commented" })
}

export const getComments = async (request: FastifyRequest, reply: FastifyReply) => {
  const { handle } = request.params as { handle: string }

  const comments = await request.server.db.getRepository(Comment).find({
    where: { user: { handle }, parentComment: IsNull() },
    relations: {
      author: true,
      user: true
    },
    order: { createdAt: "DESC" }
  })


  if (!comments.length) {
    return reply.code(404).send({ error: "No comments found" })
  }

  // Recursively fetch replies for each top-level comment
  for (const comment of comments) {
    comment.replies = await recursivelyGetReplies(comment.id, request.server.db)
  }

  return reply.code(200).send(comments)
}

// Upload Route
export const upload = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const data = await request.file()

  if (!data) {
    return reply.code(400).send({ error: "No file uploaded" })
  }

  const { file, filename, mimetype } = data

  if (!file) {
    return reply.code(400).send({ error: "No file uploaded" })
  }

  const uploadLimit = await loadUserUploadLimit(request.server.db, user.profileId)
  if (uploadLimit == null) {
    return reply.code(404).send({ error: "User not found" })
  }

  let result
  try {
    result = await uploadToS3(
      request.server.s3,
      file,
      filename,
      mimetype,
      user.profileId,
      uploadLimit
    )
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return reply.code(413).send({
        error: `File exceeds your upload limit of ${formatUploadLimit(error.limitBytes)}`,
      })
    }
    request.log.error({ err: error }, "S3 upload failed")
    return reply.code(500).send({ error: "Error uploading file to storage" })
  }

  if (!result) {
    return reply.code(500).send({ error: "Error uploading" })
  }

  const image = await request.server.db.getRepository(Image).save({
    url: result.url
  })

  if (!image) {
    return reply.code(500).send({ error: "Error saving image" })
  }

  return reply.code(200).send({ message: "Uploaded", url: result.url })
}

export const getFavorites = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.params as { handle: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { handle: user.handle }
  })

  if (!userData) return reply.code(404).send({ error: "User not found" })

  const characters = await request.server.db.getRepository(Character).find({
    where: {
      favoritedBy: {
        id: userData.id
      }
    },
    relations: {
      owner: true,
      refSheets: {
        variants: true,
      },
    },
  })

  return reply.code(200).send(characters)
}

export const notifications = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      notifications: true
    }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  return reply.code(200).send(userData.notifications)
}

export const search = async (request: FastifyRequest, reply: FastifyReply) => {
  const { query } = request.query as { query: string }

  const users = await request.server.db.getRepository(User).find({
    where: {
      handle: ILike(`%${query}%`)
    }
  })

  if (!users) {
    return reply.code(404).send({ error: "No users found" })
  }

  return reply.code(200).send(users)
}

export const setCustomHTML = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { html } = request.body as { html: string }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  userData.customHTMLCard = html

  const result = await request.server.db.getRepository(User).save(userData)

  if (!result) {
    return reply.code(500).send({ error: "Error updating profile" })
  }

  return reply.code(200).send({ message: "Updated" })
}

export const applyArtist = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = request.user as { id: string; profileId: string }
  const { name, email, bio, portfolio, imageURLs } = request.body as {
    name: string
    email: string
    bio: string
    portfolio: string
    imageURLs: string[]
  }

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId }
  })

  // TODO: Check Links for validity

  if (!userData) {
    return reply.code(404).send({ error: "User not found" })
  }

  if (userData.artistApplication) {
    return reply.code(400).send({ error: "User already has an artist application" })
  }

  if (userData.hasArtistAccess) {
    return reply.code(400).send({ error: "User already has artist access" })
  }

  if (!name || !email || !bio || !portfolio || !imageURLs || imageURLs.length !== 3) {
    return reply.code(400).send({ error: "Missing/Invalid fields" })
  }

  const moderators = await request.server.db.getRepository(User).find({
    where: { role: Role.MODERATOR }
  })

  sendMassNotification(request.server.db, moderators, "New artist application", userData, undefined, undefined)


  userData.artistApplication = {
    name,
    email,
    bio,
    portfolio,
    images: imageURLs
  }

  const result = await request.server.db.getRepository(User).save(userData)

  if (!result) {
    return reply.code(500).send({ error: "Error applying" })
  }

  return reply.code(200).send({ message: "Applied" })
}


export const getArtistsWithOpenCommissions = async (request: FastifyRequest, reply: FastifyReply) => {
  const users = await request.server.db.getRepository(User).find({
    where: { commissionStatus: CommissionStatus.OPEN },
    relations: {
      followers: true,
      following: true
    }
  })


  if (!users) {
    return reply.code(404).send({ error: "No users found" })
  }

  return reply.code(200).send(users)
}

const recursivelyGetReplies = async (commentId: string, db: DataSource) => {
  const replies = await db.getRepository(Comment).find({
    where: { parentComment: { id: commentId } },
    relations: {
      author: true,
    },
    order: { createdAt: "ASC" }
  })

  for (const reply of replies) {
    reply.replies = await recursivelyGetReplies(reply.id, db)
  }
  return replies
}

