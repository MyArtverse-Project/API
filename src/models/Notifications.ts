
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm"
import User from "./Users"
import Artwork from "./Artwork"
import Comment from "./Comments"

@Entity("notifications")
export default class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "text" })
  content: string

  @Column({ type: "boolean", default: false })
  read: boolean

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: "CASCADE" })
  @JoinColumn()
  user: User

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  sender: User

  @ManyToOne(() => Artwork, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn()
  artwork: Artwork

  @ManyToOne(() => Comment, { nullable: true })
  @JoinColumn()
  comment: Comment

  @CreateDateColumn()
  createdAt: Date
}
