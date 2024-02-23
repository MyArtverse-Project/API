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

  @Column("boolean", { default: "false" })
  verified: boolean

  @Column("uuid", { default: () => "uuid_generate_v4()" })
  verificationUUID: string

  @Column()
  email: string

  @Column()
  password: string

  @OneToOne(() => User, (user) => user.auth)
  @JoinColumn()
  user: User
}
