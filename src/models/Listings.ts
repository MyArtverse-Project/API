import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn
} from "typeorm"
import User from "./Users"

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

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date

  @ManyToOne(() => User, (user) => user.listings)
  @JoinColumn()
  user: User
}
