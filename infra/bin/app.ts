#!/usr/bin/env node
import * as cdk from "aws-cdk-lib"
import { MyArtverseStack } from "../lib/myartverse-stack"

const app = new cdk.App()

const domainName = app.node.tryGetContext("domainName") as string
const frontendDomain = app.node.tryGetContext("frontendDomain") as string
const apiSubdomain = app.node.tryGetContext("apiSubdomain") as string
const cdnSubdomain = app.node.tryGetContext("cdnSubdomain") as string
const vpcCidr = app.node.tryGetContext("vpcCidr") as string
const region = app.node.tryGetContext("region") as string
const hostedZoneId = app.node.tryGetContext("hostedZoneId") as string | undefined

new MyArtverseStack(app, "MyArtverseStack", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region },
  domainName,
  frontendDomain,
  apiSubdomain,
  cdnSubdomain,
  vpcCidr,
  hostedZoneId: hostedZoneId || undefined,
  description: "MyArtverse API — VPC, EC2, RDS, S3, CloudFront, ALB",
})
