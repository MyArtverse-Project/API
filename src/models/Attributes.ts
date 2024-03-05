import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from "typeorm"
import Character from "./Character"

@Entity()
export default class Attributes {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  bio: string

  @Column()
  pronouns: string

  @Column()
  gender: string

  @Column("jsonb")
  preferences: { likes: string[]; dislikes: string[] }

  @Column("jsonb")
  custom_fields: { property: string; value: string }[]

  @OneToOne(() => Character, (character) => character.attributes)
  @JoinColumn()
  character: Character
}
