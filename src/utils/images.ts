import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { BusboyFileStream } from "@fastify/busboy"
import * as fs from "fs"
import os from "os"
import path from "path"
import { pipeline } from "stream/promises"

const uploadToS3 = async (client: S3Client, file: BusboyFileStream, key: string, mimetype: string) => {
  // Create a temporary file to store the file
  const tempFilePath = path.join(os.tmpdir(), key)
  await pipeline(file, fs.createWriteStream(tempFilePath))

  // Get Size for Content-Length
  const { size: length } = fs.statSync(tempFilePath)
  const fileStream = fs.createReadStream(tempFilePath)

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET as string,
    Key: key,
    Body: fileStream,
    ContentType: mimetype,
    ContentLength: length
  })

  try {
    const result = await client.send(command)
    // Delete the temp file
    fs.unlinkSync(tempFilePath)

    return result
  } catch (error) {
    // Delete the temp file
    fs.unlinkSync(tempFilePath)
    throw error
  }
}

export default uploadToS3
