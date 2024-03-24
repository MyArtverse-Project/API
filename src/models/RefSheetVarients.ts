import { RefSheet } from "./RefSheet"
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"

@Entity()
export class RefSheetVariant {
  @PrimaryGeneratedColumn("uuid")
  id: number

  @Column()
  name: string

  @Column()
  url: string

  @Column()
  image: string

  @ManyToOne(() => RefSheet, (refSheet) => refSheet.variants)
  refSheet: RefSheet
}
