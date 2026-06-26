import type { FastifyReply, FastifyRequest } from "fastify"
import { Relationships, User } from "../../../models"
import { sendNotification } from "../../../utils/notification"

export const root = async (_request: FastifyRequest, _reply: FastifyReply) => {
  return { hello: "world" }
}

export const follow = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string }
  const user = request.user as { id: string; profileId: string }

  const profile = await request.server.db.getRepository(User).findOne({
    where: { id },
  })

  if (!profile) return reply.code(404).send({ error: "Profile not found" })
  if (profile.id === user.profileId) {
    return reply.code(400).send({ error: "Cannot follow yourself" })
  }

  const existing = await request.server.db.getRepository(Relationships).findOne({
    where: {
      follower: { id: user.profileId },
      following: { id },
    },
  })

  if (existing) {
    return reply.code(400).send({ error: "Already following this user" })
  }

  const follower = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
  })

  await request.server.db.getRepository(Relationships).save({
    follower: { id: user.profileId },
    following: { id },
  })

  if (follower) {
    await sendNotification(
      request.server.db,
      profile,
      "New Follower",
      follower
    )
  }

  return reply.code(200).send({ message: "Followed" })
}

export const unfollow = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string }
  const user = request.user as { id: string; profileId: string }

  const relationship = await request.server.db
    .getRepository(Relationships)
    .findOne({
      where: {
        follower: { id: user.profileId },
        following: { id },
      },
    })

  if (!relationship) {
    return reply.code(400).send({ error: "Not following this user" })
  }

  await request.server.db.getRepository(Relationships).remove(relationship)

  return reply.code(200).send({ message: "Unfollowed" })
}
