import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import Character from "./Character";

@Entity()
export default class Dashboard {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Character, (character) => character.dashboards, { onDelete: "CASCADE" })
    character: Character;

    @Column("jsonb", { nullable: false, default: [] })
    panels: {
        id: string;
        type: string;
        position: { row: number; col: number };
        settings: any;
    }[];
}
