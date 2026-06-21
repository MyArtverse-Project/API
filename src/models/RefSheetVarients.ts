import RefSheet from "./RefSheet"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"

@Entity()
export default class RefSheetVariant {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  title: string

  @Column({ default: false })
  nsfw: boolean

  @Column({ type: "text", nullable: true })
  description: string

  @Column({ type: "text", nullable: true })
  artistExternal: string

  @Column({ type: "jsonb" })
  colors: string[]

  @Column()
  url: string

  @Column({ default: false })
  main: boolean

  @ManyToOne(() => RefSheet, (refSheet) => refSheet.variants)
  refSheet: RefSheet
}
