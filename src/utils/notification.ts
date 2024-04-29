import type { DataSource } from "typeorm"
import { type Artwork, type User } from "../models"
import type { Comment } from "../models/Comments"
import { Notification } from "../models/Notifications"

export const sendNotification = async (client: DataSource, user: User, content: string, sender?: User, artwork?: Artwork, comment?: Comment) => {
    const notification = await client.getRepository(Notification).save({
        content,
        user,
        sender,
        artwork,
        comment
    })

    if (!notification) {
        return false
    }

    return true
}

export const sendMassNotification = async (client: DataSource, users: User[], content: string, sender?: User, artwork?: Artwork, comment?: Comment) => {
    for (const user of users) {
        await sendNotification(client, user, content, sender, artwork, comment)
    }

    return true
}