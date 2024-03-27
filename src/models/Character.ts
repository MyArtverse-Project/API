import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany
} from "typeorm"
import Attributes from "./Attributes"
import AdoptionStatus from "./AdoptionStatus"
import Migration from "./Migration"
import User from "./Users"
import { RefSheet } from "./RefSheet"
import { Artwork } from "./Artwork"

@Entity()
export default class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToMany(() => Artwork, (artwork) => artwork)
  artworks: Artwork[]

  @Column()
  name: string

  @Column({ nullable: true })
  safename: string

  @Column({ default: "public" })
  visibility: string

  @Column({ nullable: true })
  nickname: string

  @Column({ nullable: true })
  species: string

  @Column({ default: false })
  isHybrid: boolean

  @Column({ nullable: true })
  avatarUrl: string

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
