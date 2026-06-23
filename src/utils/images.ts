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
import { isLocalS3 } from "./config"
import { UploadLimitError } from "./uploadLimits"

export const ensureS3Bucket = async (client: S3Client) => {
  if (!isLocalS3()) {
    return
  }

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

const mimeToExtension = (mimetype: string) => {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
  }
  return map[mimetype] ?? ".bin"
}

export const uploadToS3 = async (
  client: S3Client,
  file: BusboyFileStream,
  key: string,
  mimetype: string,
  userID: string,
  maxBytes?: number
) => {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured")
  }

  const ext = path.extname(key) || mimeToExtension(mimetype)
  const storageKey = `${userID}/${randomUUID()}${ext}`
  const tempFilePath = path.join(os.tmpdir(), `${randomUUID()}${ext}`)
  let fileStream: fs.ReadStream | undefined

  try {
    await pipeline(file, fs.createWriteStream(tempFilePath))

    const { size: length } = fs.statSync(tempFilePath)

    if (maxBytes != null && length > maxBytes) {
      throw new UploadLimitError(maxBytes)
    }

    fileStream = fs.createReadStream(tempFilePath)

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: fileStream,
      ContentType: mimetype,
      ContentLength: length,
      ...(isLocalS3() ? { ACL: "public-read" } : {})
    })

    const result = await client.send(command)

    const publicBase =
      process.env.S3_PUBLIC_URL?.replace(/\/$/, "") ??
      `${process.env.S3_ENDPOINT}/${bucket}`

    return {
      ...result,
      url: `${publicBase}/${storageKey}`
    }
  } finally {
    fileStream?.destroy()
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
}
