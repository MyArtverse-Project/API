import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, RelationId } from "typeorm";
import User from "./Users";
import Character from "./Character";
import Artwork from "./Artwork";

@Entity()
export default class Folder {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column()
    name: string;

    @Column({ nullable: true })
    color: string;

    @ManyToOne(() => Folder, (folder) => folder.children, { nullable: true, onDelete: "CASCADE" })
    parent: Folder | null;

    @RelationId((folder: Folder) => folder.parent)
    parentId: string | null;

    @OneToMany(() => Folder, (folder) => folder.parent)
    children: Folder[];

    @Column({ type: "enum", enum: ["characters", "art"], default: "characters" })
    contentType: string;

    @ManyToOne(() => User, (user) => user.folders, { onDelete: "CASCADE" })
    owner: User;

    @ManyToOne(() => Character, (character) => character.galleryFolders, { nullable: true, onDelete: "CASCADE" })
    character: Character | null;

    @RelationId((folder: Folder) => folder.character)
    characterId: string | null;

    @OneToMany(() => Character, (character) => character.folder)
    characters: Character[];

    @OneToMany(() => Artwork, (art) => art.folder)
    artworks: Artwork[];
}
