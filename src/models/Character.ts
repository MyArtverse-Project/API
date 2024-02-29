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
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  full_name: string

  @Column()
  species: string

  @Column()
  is_hybrid: boolean

  @Column()
  avatar_url: string

  @OneToOne(() => Attributes, (attributes) => attributes.character)
  @JoinColumn()
  attributes: Attributes

  @OneToOne(() => Migration, (migration) => migration.character)
  @JoinColumn()
  migration: Migration

  @OneToOne(() => AdoptionStatus, (adoptionStatus) => adoptionStatus.character)
  @JoinColumn()
  adoptionStatus: AdoptionStatus

  @ManyToOne(() => User, (user) => user.characters)
  owner: User
}
