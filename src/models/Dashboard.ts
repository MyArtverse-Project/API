import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import User from "./Users";

@Entity()
export default class Dashboard {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (user) => user.dashboards, { onDelete: "CASCADE" })
  user: User;

  @Column("jsonb", { nullable: false, default: [] })
  panels: {
    id: string;
    type: string;
    position: { row: number; col: number };
    settings: any;
  }[];
}
