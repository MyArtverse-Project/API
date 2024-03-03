import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm"

@Entity("images")
export class Image {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "varchar", length: 300 })
  url: string

  @Column({ type: "varchar", length: 300, nullable: true })
  altText: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
