import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn
} from "typeorm"
import { User } from "./Users"

@Entity()
export class Auth {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  email: string

  @Column()
  password: string

  @OneToOne(() => User, (user) => user.auth)
  @JoinColumn()
  user: User
}
