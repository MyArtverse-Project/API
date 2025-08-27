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
import RefSheetVariant from "./RefSheetVarients"
import User from "./Users"

@Entity("refSheets")
export default class RefSheet {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column({ type: "text", nullable: true })
  description: string

  @Column()
  active: boolean

  @Column({ default: false })
  primary: boolean

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  artistUser: User

  @Column({ type: "text", nullable: true })
  artistExternal: string

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
