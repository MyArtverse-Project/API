import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm"
import Character from "./Character"

@Entity()
export default class Attributes {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ nullable: true })
  bio: string

  @Column({ nullable: true })
  pronouns: string

  @Column({ nullable: true })
  gender: string

  @Column("jsonb", { default: {} })
  preferences: { likes: string[]; dislikes: string[] }

  @Column("jsonb", { default: {} })
  custom_fields: { property: string; value: string }[]

  @OneToOne(() => Character, (character) => character.attributes)
  character: Character
}
