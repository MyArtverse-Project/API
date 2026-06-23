import { DataSource } from "typeorm"
import {
  AdoptionStatus,
  Artwork,
  Attributes,
  Auth,
  Character,
  Comment,
  Dashboard,
  Folder,
  Image,
  Commission,
  Migration,
  Notification,
  RefSheet,
  RefSheetVariant,
  Relationships,
  User
} from '../models'
import CharacterDashboard from "../models/CharacterDashboard"
/**
 * Connects to the database
 */
const connectDatabase = async (): Promise<DataSource> => {
  const host = process.env.DB_HOST
  const useSsl = host && host !== "localhost" && host !== "postgres"

  const connection = new DataSource({
    type: "postgres",
    host,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    entities: [
      AdoptionStatus,
      Artwork,
      Attributes,
      Auth,
      Character,
      CharacterDashboard,
      Comment,
      Dashboard,
      Folder,
      Image,
      Commission,
      Migration,
      Notification,
      RefSheet,
      RefSheetVariant,
      Relationships,
      User
    ],
    synchronize: true,

    logging: false,
  })
  await connection
    .initialize()
    .then(() => {
      console.log("MyArtverse is connected to the database!")
    })
    .catch((err) => {
      throw new Error(`Error connecting to database: ${err}`)
    })

  return connection
}

export default connectDatabase
