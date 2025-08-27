import RefSheet from "./RefSheet"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm"
import User from "./Users"

@Entity()
export default class RefSheetVariant {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column({ default: false })
  nsfw: boolean

  @Column({ type: "jsonb" })
  colors: string[]

  @Column()
  url: string

  @Column({ default: false })
  main: boolean

  @ManyToOne(() => RefSheet, (refSheet) => refSheet.variants)
  refSheet: RefSheet
}
