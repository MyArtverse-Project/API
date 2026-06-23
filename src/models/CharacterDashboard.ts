import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm"
import Character from "./Character"

@Entity("character_dashboard")
@Unique(["character"])
export default class CharacterDashboard {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => Character, (character) => character.dashboards, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "characterId" })
  character: Character

  @Column("jsonb", { nullable: false, default: [] })
  panels: {
    id: string
    type: string
    position: { row: number; col: number }
    settings: Record<string, unknown>
  }[]
}
