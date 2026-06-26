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
  artistUser: User | null

  @Column({ type: "varchar", length: 32, nullable: true })
  artistPlatform: string | null

  @Column({ type: "varchar", length: 200, nullable: true })
  artistExternalHandle: string | null

  @Column({ type: "varchar", nullable: true })
  artistUrl: string | null

  @Column({ type: "varchar", nullable: true })
  artistExternalAvatarUrl: string | null

  @Column({ type: "text", nullable: true })
  artistExternal: string | null

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
