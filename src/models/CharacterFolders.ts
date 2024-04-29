import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany } from 'typeorm';
import User from './Users';
import Character from './Character';

@Entity()
export class CharacterFolders {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    folderColor: string;

    @ManyToOne(() => User, (user) => user.characterFolders)
    user: User;

    @ManyToMany(() => Character, (character) => character.characterFolders)
    characters: Character[];
}