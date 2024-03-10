import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne
} from "typeorm"
import User from "./Users"

@Entity("artwork")
export class Artwork {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 300 })
  url: string

  @Column({ type: "varchar", length: 300, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  type: "character" | "user"

  @Column({ nullable: true })
  ownerId: string
}
