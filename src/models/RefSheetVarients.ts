import { RefSheet } from "./RefSheet"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"

@Entity()
export class RefSheetVariant {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column()
  nsfw: boolean

  @Column()
  url: string

  @Column({ default: false })
  main: boolean

  @ManyToOne(() => RefSheet, (refSheet) => refSheet.variants)
  refSheet: RefSheet
}
