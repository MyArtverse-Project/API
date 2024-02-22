import {Entity, PrimaryGeneratedColumn, Column, OneToOne} from "typeorm";
import { Character } from "./Character";

@Entity()
export class Migration {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    url: string;

    @Column()
    migrate_date: Date;

    @OneToOne(() => Character, character => character.migration)
    character: Character;
}
