import { DataSource } from 'typeorm';

/**
 * Connects to the database
 * 
 */
const connectDatabase = async () => {
    const connection = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        entities: [__dirname + '/models/*.ts'],
        synchronize: true,
        logging: false,
    })
    try {
        await connection.initialize()
    } catch (err) {
        throw new Error(`Error connecting to database: ${err}`)
    } finally {
        console.log("MyArtverse is connected to the database!")
    }
}

export default connectDatabase;