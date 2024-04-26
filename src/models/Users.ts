import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToOne,
  ManyToMany,
  JoinTable
} from "typeorm"
import Auth from "./Auth"
import Relationships from "./Relationships"
import AdoptionStatus from "./AdoptionStatus"
import Character from "./Character"
import Commission from "./Listings"
import Artwork from "./Artwork"
import { Notification } from "./Notifications"

export enum Role {
  USER = "user",
  MODERATOR = "moderator",
  ADMIN = "admin",
  DEVELOPER = "developer"
}

@Entity("users")
export default class User {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ unique: true })
  handle: string

  @Column({ nullable: true })
  pronouns: string

  @Column({ nullable: true })
  nationality: string

  @Column({ nullable: true })
  birthday: Date

  @Column({ nullable: true })
  displayName: string

  @Column({ nullable: true })
  bio: string

  @Column({ nullable: true })
  avatarUrl: string

  @Column({ nullable: true })
  bannerUrl: string

  @CreateDateColumn({
    type: "timestamp with time zone",
    name: "dateRegistered",
    nullable: true
  })
  dateRegistered: Date

  @UpdateDateColumn({
    type: "timestamp with time zone",
    name: "dateUpdated",
    nullable: true
  })
  dateUpdated: Date

  @Column({ default: false })
  hasArtistAccess: boolean

  @Column({ default: false })
  hasBetaAccess: boolean

  @Column("jsonb", { nullable: true })
  links: { url: string; label: string }[]

  @Column("jsonb", { nullable: true })
  badges: { roleName: string; rewardDate: Date }[]

  @OneToMany(() => Relationships, (follower) => follower.following)
  followers: Relationships[]

  @OneToMany(() => Relationships, (following) => following.follower)
  following: Relationships[]

  @OneToOne(() => Auth, (authentication) => authentication.user)
  auth: Auth

  @OneToMany(() => AdoptionStatus, (adoptionStatus) => adoptionStatus.previous_owner)
  adoptionStatuses: AdoptionStatus[]

  @OneToOne(() => AdoptionStatus, (adoptionStatus) => adoptionStatus.ownership)
  adoptionStatus: AdoptionStatus

  @OneToMany(() => Character, (character) => character.owner)
  @JoinColumn()
  characters: Character[]

  @Column({ nullable: true })
  customHTMLCard: string

  @OneToOne(() => Character, (character) => character.mainOwner)
  @JoinColumn()
  mainCharacter: Character | null

  @OneToMany(() => Commission, (commission) => commission.user)
  listings: Commission[]

  @ManyToMany(() => Character, (character) => character.favoritedBy)
  @JoinTable()
  favoriteCharacters: Character[]

  @OneToMany(() => Artwork, (artwork) => artwork.owner)
  @JoinColumn()
  ownedArtworks: Artwork[]

  @ManyToMany(() => Artwork, (artwork) => artwork)
  @JoinTable()
  favoriteArtworks: Artwork[]

  @Column({ default: "offline" })
  onlineStatus: string

  @Column({ nullable: true })
  customStatus: string

  @Column("jsonb", { nullable: true })
  previousAliases: { displayName: string; changeDate: Date }[]

  @OneToMany(() => Notification, (notification) => notification.user)
  @JoinColumn()
  notifications: Notification[]

  @ManyToOne(() => Artwork, (artwork) => artwork)
  artworks: Artwork[]

  @Column({ default: Role.USER })
  role: Role
}
