import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Auth } from './Auth';
import { Relationships } from './Relationships';
import { AdoptionStatus } from './AdoptionStatus';
import { Character } from './Character';
import { Commission } from './Listings';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    handle: string;

    @Column({ nullable: true })
    displayName: string;

    @Column({ nullable: true })
    bio: string;

    @Column({ nullable: true })
    avatarUrl: string;

    @Column({ nullable: true })
    bannerUrl: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'dateRegistered', nullable: true })
    dateRegistered: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', name: 'dateUpdated', nullable: true  })
    dateUpdated: Date;

    @Column({ default: false })
    hasArtistAccess: boolean;

    @Column({ default: false })
    hasBetaAccess: boolean;

    @Column('jsonb', { nullable: true })
    links: { url: string; label: string }[];

    @Column('jsonb', { nullable: true })
    badges: { roleName: string; rewardDate: Date }[];

    @OneToMany(() => Relationships, follower => follower.following)
    followers: Relationships[];

    @OneToMany(() => Relationships, following => following.follower)
    following: Relationships[];

    @OneToOne(() => Auth, authentication => authentication.user)
    auth: Auth;

    @OneToMany(() => AdoptionStatus, adoptionStatus => adoptionStatus.previous_owner)
    adoptionStatuses: AdoptionStatus[];

    @OneToOne(() => AdoptionStatus, adoptionStatus => adoptionStatus.ownership)
    adoptionStatus: AdoptionStatus;

    @OneToMany(() => Character, character => character.owner)
    characters: Character[];

    @OneToMany(() => Commission, commission => commission.user)
    listings: Commission[];

    @Column({ default: 'offline' })
    onlineStatus: string;

    @Column({ nullable: true })
    customStatus: string;

    @Column('jsonb', { nullable: true })
    previousAliases: { displayName: string; changeDate: Date }[];
}
