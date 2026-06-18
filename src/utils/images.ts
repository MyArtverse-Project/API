import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  type S3Client
} from "@aws-sdk/client-s3"
import type { BusboyFileStream } from "@fastify/busboy"
import { randomUUID } from "crypto"
import * as fs from "fs"
import os from "os"
import path from "path"
import { pipeline } from "stream/promises"

export const ensureS3Bucket = async (client: S3Client) => {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    console.warn("S3_BUCKET is not configured, skipping bucket setup")
    return
  }

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }))
    } catch (err) {
      console.error("Failed to create S3 bucket", err)
      return
    }
  }

  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: { AWS: ["*"] },
        Action: ["s3:GetObject"],
        Resource: [`arn:aws:s3:::${bucket}/*`]
      }
    ]
  }

  try {
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy)
      })
    )
    console.log(`S3 bucket "${bucket}" configured for public read`)
  } catch (err) {
    console.error("Failed to set S3 bucket policy", err)
  }
}

export const uploadToS3 = async (
  client: S3Client,
  file: BusboyFileStream,
  key: string,
  mimetype: string,
  userID: string
) => {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured")
  }

  const ext = path.extname(key)
  const tempFilePath = path.join(os.tmpdir(), `${randomUUID()}${ext}`)
  let fileStream: fs.ReadStream | undefined

  try {
    await pipeline(file, fs.createWriteStream(tempFilePath))

    const { size: length } = fs.statSync(tempFilePath)
    fileStream = fs.createReadStream(tempFilePath)

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `${userID}/${key}`,
      Body: fileStream,
      ContentType: mimetype,
      ContentLength: length,
      ACL: "public-read"
    })

    const result = await client.send(command)

    return {
      ...result,
      url: `${process.env.S3_ENDPOINT}/${bucket}/${userID}/${key}`
    }
  } finally {
    fileStream?.destroy()
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}
