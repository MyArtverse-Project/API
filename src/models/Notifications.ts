
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany
} from "typeorm"
import User from "./Users"
import Artwork from "./Artwork"
import { Comment } from "./Comments"

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "text" })
  content: string

  @Column({ type: "boolean", default: false })
  read: boolean

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn()
  user: User

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  sender: User

  @ManyToOne(() => Artwork, { nullable: true })
  @JoinColumn()
  artwork: Artwork

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn()
  comment: Comment

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date
}
