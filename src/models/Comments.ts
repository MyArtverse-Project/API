import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm"
import { Character, User } from "."
import Artwork from "./Artwork"

@Entity()
export class Comment {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  content: string

  @ManyToOne(() => User, { nullable: true })
  author: User

  @ManyToOne(() => User, { nullable: true })
  user: User

  @ManyToOne(() => Artwork, { nullable: true })
  artwork?: Artwork

  @ManyToOne(() => Character, { nullable: true })
  character?: Character

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
