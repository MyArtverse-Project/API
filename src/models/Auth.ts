import {Entity, PrimaryGeneratedColumn, Column, OneToOne} from "typeorm";
import { User } from "./Users";

@Entity()
export class Authentication {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    email: string;

    @Column()
    password: string;

    @OneToOne(() => User, user => user.authentication)
    user: User;
}
