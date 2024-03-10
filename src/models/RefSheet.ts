import {
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
import User from "./Users"

@Entity("refSheets")
export class RefSheet {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @OneToOne(() => Artwork, (artwork) => artwork)
  @JoinColumn()
  artwork: Artwork

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Character, (character) => character.refSheets)
  @JoinColumn()
  character: Character

  @OneToOne(() => User, (user) => user.artworks)
  creator: User
}
