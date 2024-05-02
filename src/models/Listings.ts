import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany
} from "typeorm"
import User from "./Users"
import { Image } from "./Image"

@Entity("commissions")
export default class Commission {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 255 })
  title: string

  @Column({ type: "text" })
  description: string

  @Column({ type: "decimal" })
  price: number

  @Column()
  listingBannerUrl: string

  @Column('jsonb')
  examples: string[]

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date

  @ManyToOne(() => User, (user) => user.listings)
  @JoinColumn()
  user: User
}
