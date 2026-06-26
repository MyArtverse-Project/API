import type { DataSource } from "typeorm"
import Comment from "../models/Comments"

export async function recursivelyGetReplies(commentId: string, db: DataSource) {
  const replies = await db.getRepository(Comment).find({
    where: { parentComment: { id: commentId } },
    relations: {
      author: true,
    },
    order: { createdAt: "ASC" },
  })

  for (const reply of replies) {
    reply.replies = await recursivelyGetReplies(reply.id, db)
  }

  return replies
}

export async function attachCommentReplies(
  comments: Comment[],
  db: DataSource
) {
  for (const comment of comments) {
    comment.replies = await recursivelyGetReplies(comment.id, db)
  }

  return comments
}
