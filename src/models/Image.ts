import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne
} from "typeorm"
import { Artwork } from "./Artwork"
import User from "./Users"

@Entity("images")
export class Image {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  url: string

  @ManyToOne(() => Artwork)
  artwork: Artwork

  @ManyToOne(() => User)
  artist: User

  @Column({ type: "varchar", length: 255, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
