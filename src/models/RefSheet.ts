import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm"
import Character from "./Character"
import { RefSheetVariant } from "./RefSheetVarients"

@Entity("refSheets")
export class RefSheet {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  refSheetName: string

  @Column({ type: "jsonb" })
  colors: string[]

  @Column()
  active: boolean

  @OneToMany(() => RefSheetVariant, (variant) => variant.refSheet, { eager: true })
  @JoinColumn()
  variants: RefSheetVariant[]

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToOne(() => Character, (character) => character.refSheets)
  @JoinColumn()
  character: Character
}
