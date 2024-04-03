import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  OneToOne,
  JoinColumn,
  JoinTable
} from "typeorm"
import User from "./Users"
import Character from "./Character"
import { Image } from "./Image"
import { Comment } from "./Comments"

@Entity("artwork")
export class Artwork {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 300, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @OneToOne(() => Image, { eager: true })
  @JoinColumn()
  image: Image

  @ManyToMany(() => Character, (character) => character.artworks, { nullable: true })
  charactersFeatured: Character[]

  @OneToOne(() => User, (user) => user.artworks, { nullable: true })
  artist: User | null

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

  @Column()
  title: string

  @ManyToMany(() => User, (user) => user.favoriteArtworks)
  @JoinTable()
  favoritedBy: User[]
  
  @ManyToOne(() => User, (user) => user.ownedArtworks)
  @JoinColumn()
  owner: User
}
