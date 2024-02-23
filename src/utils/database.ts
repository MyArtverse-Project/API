import { DataSource } from "typeorm"

/**
 * Connects to the database
 *
 */
const connectDatabase = async (): Promise<DataSource> => {
  const connection = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: ["src/models/*.ts"],
    synchronize: true,
    logging: false
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
