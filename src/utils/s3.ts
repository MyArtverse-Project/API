import { S3Client, type S3ClientConfig } from "@aws-sdk/client-s3"
import { isLocalS3 } from "./config"

export const createS3Client = (): S3Client => {
  const region = process.env.AWS_DEFAULT_REGION ?? "us-east-1"
  const config: S3ClientConfig = { region }

  if (isLocalS3()) {
    config.endpoint = process.env.S3_ENDPOINT
    config.forcePathStyle = true
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    }
  }

  return new S3Client(config)
}
