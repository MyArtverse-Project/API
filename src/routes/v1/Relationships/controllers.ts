import type { FastifyReply, FastifyRequest } from "fastify"
import { Relationships, User } from "../../../models"
import { send } from "process"
import { sendNotification } from "../../../utils/notification"

export const root = async (request: FastifyRequest, reply: FastifyReply) => {
  return { hello: "world" }
}

export const follow = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string }
  const user = request.user as { id: string; profileId: string }
  const profile = await request.server.db.getRepository(User).findOne({
    where: { id },
    relations: {
      followers: {
        follower: true,
        following: true
      }
    }
  })

  const userData = await request.server.db.getRepository(User).findOne({
    where: { id: user.profileId },
    relations: {
      followers: true,
      following: true
    }
  })                          
  
  await sendNotification(
    request.server.db,
    userData as User,
    "New Follower",
    
    profile as User,
    
  )

  if (!profile) return reply.code(404).send({ error: "Profile not found" })
  if (profile.id === user.profileId) return reply.code(400).send({ error: "Cannot follow yourself" })
  if (profile.followers.find((follower) => follower.follower.id === user.profileId)) {
    return reply.code(400).send({ error: "Already following this user" })
  }

  // console.log(profile.followers)

  await request.server.db.getRepository(Relationships).save({
    follower: { id: user.profileId },
    following: { id }
  })

  return reply.code(200).send({ message: "Followed" })

}

export const unfollow = async (request: FastifyRequest, reply: FastifyReply) => {
  const { id } = request.params as { id: string }
  const user = request.user as { id: string; profileId: string }
  const profile = await request.server.db.getRepository(User).findOne({
    where: { id },
    relations: {
      followers: true
    }
  })
  if (!profile) return reply.code(404).send({ error: "Profile not found" })
  if (profile.id === user.profileId) return reply.code(400).send({ error: "Cannot unfollow yourself" })
  if (!profile.followers.find((follower) => follower.id === user.profileId)) {
    return reply.code(400).send({ error: "Not following this user" })
  }

  await request.server.db.getRepository(User).save({
    ...profile,
    followers: profile.followers.filter((follower) => follower.id !== user.profileId)
  })

  return reply.code(200).send({ message: "Unfollowed" })
}