import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, OneToMany } from 'typeorm';
import { Authentication } from './Auth';
import { Relationships } from './Relationships';
import { AdoptionStatus } from './AdoptionStatus';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    handle: string;

    @Column()
    displayName: string;

    @Column()
    bio: string;

    @Column()
    avatarUrl: string;

    @Column()
    bannerUrl: string;

    @CreateDateColumn({ type: 'timestamp with time zone', name: 'dateRegistered' })
    dateRegistered: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone', name: 'dateUpdated' })
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

    @OneToOne(() => Authentication, authentication => authentication.user)
    authentication: Authentication;

    @OneToMany(() => AdoptionStatus, adoptionStatus => adoptionStatus.previous_owner)
    adoptionStatuses: AdoptionStatus[];

    @OneToOne(() => AdoptionStatus, adoptionStatus => adoptionStatus.ownership)
    adoptionStatus: AdoptionStatus;

    @Column()
    charactersCount: number;

    @Column()
    listingsCount: number;

    @Column({ default: 'offline' })
    onlineStatus: string;

    @Column({ nullable: true })
    customStatus: string;

    @Column('jsonb', { nullable: true })
    previousAliases: { displayName: string; changeDate: Date }[];


}
