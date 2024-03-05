import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne
} from "typeorm"
import Attributes from "./Attributes"
import AdoptionStatus from "./AdoptionStatus"
import Migration from "./Migration"
import User from "./Users"

@Entity()
export default class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

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

  @Column({ nullable: true })
  reference_sheet_url: string

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
