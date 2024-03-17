import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  OneToOne
} from "typeorm"
import User from "./Users"
import Character from "./Character"
import { Image } from "./Image"

@Entity("artwork")
export class Artwork {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 300, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToOne(() => Image)

  @ManyToMany(() => Character, (character) => character.artworks)
  characters: Character[]
}
