import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm"
import Character from "./Character"
import { Comment } from "./Comments"
import User from "./Users"

@Entity("artwork")
export default class Artwork {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 300, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @Column({ nullable: true })
  artworkUrl: string

  @Column({ nullable: true })
  watermarkUrl: string

  @ManyToMany(() => Character, (character) => character.artworks, { nullable: true })
  charactersFeatured: Character[]

  @OneToOne(() => User, (user) => user.artworks, { nullable: true })
  artist: User | null

  @Column({ nullable: true, default: false })
  nsfw: boolean 

  @Column({ nullable: true })
  artistUrl: string

  @OneToMany(() => Comment, (comment) => comment.artwork)
  comments: Comment[]

  @Column({ type: "varchar", length: 300, nullable: true })
  description: string

  @Column({ default: [], type: 'jsonb' })
  tags: string[]

  @Column({ nullable: true })
  programUsed: string

  @Column({ nullable: true })
  title: string

  @ManyToMany(() => User, (user) => user.favoriteArtworks)
  @JoinTable()
  favoritedBy: User[]
  
  @ManyToOne(() => User, (user) => user.ownedArtworks)
  @JoinColumn()
  owner: User
}
