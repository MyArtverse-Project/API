import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm"
import Attributes from "./Attributes"
import AdoptionStatus from "./AdoptionStatus"
import Migration from "./Migration"
import User from "./Users"
import RefSheet from "./RefSheet"
import Artwork from "./Artwork"
import Folder from "./Folder"
import CharacterDashboard from "./CharacterDashboard"

@Entity()
export default class Character {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToMany(() => Artwork, (artwork) => artwork.charactersFeatured)
  @JoinTable()
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

  @Column({ nullable: true })
  slug: string

  @Column({ default: false })
  isHybrid: boolean

  @Column({ nullable: true })
  avatarUrl: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @ManyToMany(() => User, (user) => user.favoriteCharacters)
  @JoinTable({
    name: "character_favorited_by_users",
    joinColumn: { name: "characterId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "usersId", referencedColumnName: "id" },
  })
  favoritedBy: User[]

  @OneToMany(() => RefSheet, (refSheet) => refSheet.character, { eager: true })
  @JoinColumn()
  refSheets: RefSheet[]

  @OneToOne(() => Attributes, (attributes) => attributes.character, {
    eager: true,
    onDelete: "CASCADE"
  })
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

  @ManyToOne(() => User, (user) => user.characters, { eager: true })
  owner: User

  @ManyToOne(() => Folder, (folder) => folder.characters, { onDelete: "SET NULL", nullable: true })
  folder: Folder | null;

  @OneToMany(() => Folder, (folder) => folder.character)
  galleryFolders: Folder[];

  @OneToMany(() => CharacterDashboard, (dashboard) => dashboard.character, {
    cascade: true,
  })
  dashboards: CharacterDashboard[]

  // Stats

  @Column({ default: 0 })
  views: number
}
