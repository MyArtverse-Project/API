import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany
} from "typeorm"
import Attributes from "./Attributes"
import AdoptionStatus from "./AdoptionStatus"
import Migration from "./Migration"
import User from "./Users"
import { RefSheet } from "./RefSheet"

@Entity()
export default class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  safename: string

  @Column()
  visible: boolean

  @Column()
  nickname: string

  @Column()
  species: string

  @Column({ default: false })
  is_hybrid: boolean

  @Column({ nullable: true })
  avatar_url: string

  @OneToMany(() => RefSheet, (refSheet) => refSheet.character)
  refSheets: RefSheet[]

  @OneToOne(() => Attributes, (attributes) => attributes.character)
  @JoinColumn()
  attributes: Attributes

  @OneToOne(() => Migration, (migration) => migration.character)
  @JoinColumn()
  migration: Migration

  @OneToOne(() => AdoptionStatus, (adoptionStatus) => adoptionStatus.character)
  @JoinColumn()
  adoptionStatus: AdoptionStatus

  @OneToOne(() => User, (user) => user.mainCharacter, { nullable: true })
  mainOwner: User

  @ManyToOne(() => User, (user) => user.characters)
  owner: User
}
