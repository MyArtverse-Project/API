import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm"
import Character from "./Character"
import User from "./Users"
import Artwork from "./Artwork"

@Entity()
export default class Comment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  content: string

  @ManyToOne(() => User, { nullable: true })
  author: User

  @ManyToOne(() => User, { nullable: true })
  user: User

  @ManyToOne(() => Comment, { nullable: true })
  parentComment?: Comment

  @OneToMany(() => Comment, (comment) => comment.parentComment)
  replies: Comment[]

  @ManyToOne(() => Artwork, { nullable: true })
  artwork?: Artwork

  @ManyToOne(() => Character, { nullable: true })
  character?: Character

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
