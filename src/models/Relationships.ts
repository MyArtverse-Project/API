import { Entity, PrimaryGeneratedColumn, ManyToOne } from "typeorm"
import User from "./Users"

@Entity("relationships")
export default class Relationships {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @ManyToOne(() => User, (user) => user.following)
  following: User

  @ManyToOne(() => User, (user) => user.followers)
  follower: User
}
