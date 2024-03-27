import { RefSheet } from "./RefSheet"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"

@Entity()
export class RefSheetVariant {
  @PrimaryGeneratedColumn("uuid")
  id: number

  @Column()
  name: string

  @Column()
  nsfw: boolean

  @Column()
  url: string

  @Column()
  main: boolean

  @ManyToOne(() => RefSheet, (refSheet) => refSheet.variants)
  refSheet: RefSheet
}
