import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm"
import User from "./Users"

@Entity("user_dashboard")
@Unique(["user"])
export default class Dashboard {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => User, (user) => user.dashboards, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User

  @Column("jsonb", { nullable: false, default: [] })
  panels: {
    id: string
    type: string
    position: { row: number; col: number }
    settings: Record<string, unknown>
  }[]
}
