import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from "typeorm"
import Character from "./Character"

@Entity()
export default class Migration {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  url: string

  @Column({ type: "timestamp with time zone" })
  migrate_date: Date

  @OneToOne(() => Character, (character) => character.migration)
  character: Character
}
