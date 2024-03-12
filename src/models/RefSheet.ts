import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm"
import { Artwork } from "./Artwork"
import Character from "./Character"

@Entity("refSheets")
export class RefSheet {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  active: boolean

  @OneToOne(() => Artwork, (artwork) => artwork, { eager: true })
  @JoinColumn()
  artwork: Artwork

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Character, (character) => character.refSheets)
  @JoinColumn()
  character: Character
}
