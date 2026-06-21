import * as cdk from "aws-cdk-lib"
import * as acm from "aws-cdk-lib/aws-certificatemanager"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as ecr from "aws-cdk-lib/aws-ecr"
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2"
import * as iam from "aws-cdk-lib/aws-iam"
import * as logs from "aws-cdk-lib/aws-logs"
import * as rds from "aws-cdk-lib/aws-rds"
import * as route53 from "aws-cdk-lib/aws-route53"
import * as route53targets from "aws-cdk-lib/aws-route53-targets"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import * as targets from "aws-cdk-lib/aws-elasticloadbalancingv2-targets"
import { Construct } from "constructs"

export interface MyArtverseStackProps extends cdk.StackProps {
  domainName: string
  frontendDomain: string
  apiSubdomain: string
  cdnSubdomain: string
  vpcCidr: string
  hostedZoneId?: string
  /** Full API hostname, e.g. api.myartverse.app (overrides apiSubdomain.domainName) */
  apiHostname?: string
  /** Existing ACM cert ARN in the stack region (for HTTPS without Route 53) */
  certificateArn?: string
  /** Cookie domain, e.g. .myartverse.app */
  cookieDomain?: string
}

export class MyArtverseStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MyArtverseStackProps) {
    super(scope, id, props)

    const apiDomain = props.apiHostname ?? `${props.apiSubdomain}.${props.domainName}`
    const cdnDomain = `${props.cdnSubdomain}.${props.domainName}`
    const frontendUrl = `https://${props.frontendDomain}`
    const cookieDomain =
      props.cookieDomain ??
      (props.apiHostname?.includes(".")
        ? `.${props.apiHostname.split(".").slice(-2).join(".")}`
        : `.${props.domainName}`)

    // ── VPC (10.252.254.0/25) ──────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr(props.vpcCidr),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 28 },
        {
          name: "private-app",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 28,
        },
        {
          name: "private-db",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 28,
        },
      ],
    })

    vpc.addGatewayEndpoint("S3Endpoint", {
      service: ec2.GatewayVpcEndpointAwsService.S3,
    })

    // ── S3 uploads bucket (private) ────────────────────────────────────────
    const uploadsBucket = new s3.Bucket(this, "UploadsBucket", {
      bucketName: `myartverse-uploads-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    // ── CloudFront CDN for public image reads ──────────────────────────────
    const oac = new cloudfront.S3OriginAccessControl(this, "UploadsOAC", {
      originAccessControlName: "myartverse-uploads-oac",
    })

    const cdnCert = props.hostedZoneId
      ? new acm.Certificate(this, "CdnCert", {
          domainName: cdnDomain,
          validation: acm.CertificateValidation.fromDns(
            route53.HostedZone.fromHostedZoneAttributes(this, "CdnZoneLookup", {
              hostedZoneId: props.hostedZoneId,
              zoneName: props.domainName,
            })
          ),
        })
      : undefined

    const distribution = new cloudfront.Distribution(this, "CdnDistribution", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(uploadsBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      },
      domainNames: cdnCert ? [cdnDomain] : undefined,
      certificate: cdnCert,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      comment: "MyArtverse user uploads CDN",
    })

    // ── ECR ────────────────────────────────────────────────────────────────
    const repository = new ecr.Repository(this, "ApiRepository", {
      repositoryName: "myartverse-api",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    })

    // ── RDS PostgreSQL ─────────────────────────────────────────────────────
    const dbSecurityGroup = new ec2.SecurityGroup(this, "DbSecurityGroup", {
      vpc,
      description: "RDS PostgreSQL for MyArtverse",
      allowAllOutbound: false,
    })

    const ec2SecurityGroup = new ec2.SecurityGroup(this, "Ec2SecurityGroup", {
      vpc,
      description: "MyArtverse API EC2 instances",
      allowAllOutbound: true,
    })

    dbSecurityGroup.addIngressRule(
      ec2SecurityGroup,
      ec2.Port.tcp(5432),
      "PostgreSQL from API EC2"
    )

    const dbCredentials = rds.Credentials.fromGeneratedSecret("myartverse", {
      secretName: "myartverse/rds/credentials",
    })

    const database = new rds.DatabaseInstance(this, "Database", {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO
      ),
      vpc,
      vpcSubnets: { subnetGroupName: "private-db" },
      securityGroups: [dbSecurityGroup],
      credentials: dbCredentials,
      databaseName: "myartverse",
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(7),
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      publiclyAccessible: false,
    })

    // ── App secrets (populate after deploy) ────────────────────────────────
    const appSecret = new secretsmanager.Secret(this, "AppSecret", {
      secretName: "myartverse/app/config",
      description: "MyArtverse API runtime configuration",
      secretObjectValue: {
        MA_JWT_SECRET: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        MA_COOKIE_SECRET: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        MA_SESSION_SECRET: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        RESEND_API_KEY: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        GOOGLE_CLIENT_ID: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        GOOGLE_CLIENT_SECRET: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        FACEBOOK_CLIENT_ID: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
        FACEBOOK_CLIENT_SECRET: cdk.SecretValue.unsafePlainText("CHANGE_ME"),
      },
    })

    // ── EC2 IAM role ───────────────────────────────────────────────────────
    const ec2Role = new iam.Role(this, "Ec2Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy"
        ),
      ],
    })

    uploadsBucket.grantReadWrite(ec2Role)
    appSecret.grantRead(ec2Role)
    database.secret!.grantRead(ec2Role)
    repository.grantPull(ec2Role)

    ec2Role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:GetAuthorizationToken"],
        resources: ["*"],
      })
    )

    // ── EC2 launch template + instance ─────────────────────────────────────
    const userData = ec2.UserData.forLinux()
    userData.addCommands(
      "set -euxo pipefail",
      "dnf update -y",
      "dnf install -y docker jq",
      "systemctl enable docker",
      "systemctl start docker",
      "",
      `REGION="${this.region}"`,
      `ACCOUNT="${this.account}"`,
      `ECR_REPO="${repository.repositoryName}"`,
      `RDS_SECRET_ARN="${database.secret!.secretArn}"`,
      `APP_SECRET_ARN="${appSecret.secretArn}"`,
      `S3_BUCKET="${uploadsBucket.bucketName}"`,
      `CDN_URL="https://${cdnDomain}"`,
      `API_URL="https://${apiDomain}"`,
      `FRONTEND_URL="${frontendUrl}"`,
      "",
      "mkdir -p /opt/myartverse",
      "",
      "# Build .env from Secrets Manager",
      "RDS_JSON=$(aws secretsmanager get-secret-value --region $REGION --secret-id $RDS_SECRET_ARN --query SecretString --output text)",
      "APP_JSON=$(aws secretsmanager get-secret-value --region $REGION --secret-id $APP_SECRET_ARN --query SecretString --output text)",
      "",
      `jq -nr --argjson rds "$RDS_JSON" --argjson app "$APP_JSON" \\
        --arg bucket "$S3_BUCKET" --arg cdn "$CDN_URL" --arg api "$API_URL" \\
        --arg frontend "${frontendUrl}" --arg domain "${cookieDomain}" \\
        --arg frontendDomain "${props.frontendDomain}" \\
        --arg region "${this.region}" \\
        '$app + {
          MA_PORT: "8081",
          MA_INTERFACE: "0.0.0.0",
          MA_FRONTEND_HTTP: "https://",
          MA_FRONTEND_DOMAIN: $frontendDomain,
          MA_FRONTEND_PORT: "443",
          FRONTEND_URL: $frontend,
          COOKIE_DOMAIN: $domain,
          API_BASE_URL: $api,
          DB_NAME: "myartverse",
          DB_PORT: "5432",
          DB_HOST: $rds.host,
          DB_USER: $rds.username,
          DB_PASS: $rds.password,
          AWS_DEFAULT_REGION: $region,
          S3_BUCKET: $bucket,
          S3_PUBLIC_URL: $cdn,
          EMAIL_TRANSPORT: "resend",
          RESEND_FROM_EMAIL: "MyArtverse <noreply@myartverse.app>",
          GOOGLE_REDIRECT_URI: ($api + "/v1/auth/google/callback"),
          FACEBOOK_REDIRECT_URI: ($api + "/v1/auth/facebook/callback")
        } | to_entries | .[] | "\\(.key)=\\(.value)"' > /opt/myartverse/.env`,
      "",
      "# Pull and run API container",
      "aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$REGION.amazonaws.com",
      "docker pull $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:latest || true",
      "docker rm -f myartverse-api 2>/dev/null || true",
      "docker run -d --name myartverse-api --restart always --env-file /opt/myartverse/.env -p 8081:8081 $ACCOUNT.dkr.ecr.$REGION.amazonaws.com/$ECR_REPO:latest"
    )

    const apiInstance = new ec2.Instance(this, "ApiInstance", {
      vpc,
      vpcSubnets: { subnetGroupName: "private-app" },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.SMALL
      ),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: ec2SecurityGroup,
      role: ec2Role,
      userData,
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      associatePublicIpAddress: false,
    })

    // ── Application Load Balancer ──────────────────────────────────────────
    const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
      vpc,
      description: "MyArtverse API ALB",
      allowAllOutbound: true,
    })
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      "HTTPS from internet"
    )
    albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      "HTTP redirect"
    )

    ec2SecurityGroup.addIngressRule(
      albSecurityGroup,
      ec2.Port.tcp(8081),
      "API traffic from ALB"
    )

    const alb = new elbv2.ApplicationLoadBalancer(this, "ApiAlb", {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
      vpcSubnets: { subnetGroupName: "public" },
    })

    const apiCert = props.hostedZoneId
      ? new acm.Certificate(this, "ApiCert", {
          domainName: apiDomain,
          validation: acm.CertificateValidation.fromDns(
            route53.HostedZone.fromHostedZoneAttributes(this, "ApiZoneLookup", {
              hostedZoneId: props.hostedZoneId,
              zoneName: props.domainName,
            })
          ),
        })
      : props.certificateArn
        ? acm.Certificate.fromCertificateArn(
            this,
            "ApiCert",
            props.certificateArn
          )
        : undefined

    const useHttps = Boolean(apiCert)

    const targetGroup = new elbv2.ApplicationTargetGroup(this, "ApiTargetGroup", {
      vpc,
      port: 8081,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [new targets.InstanceTarget(apiInstance, 8081)],
      healthCheck: {
        path: "/health",
        healthyHttpCodes: "200",
        interval: cdk.Duration.seconds(30),
      },
    })

    if (apiCert) {
      alb.addListener("HttpsListener", {
        port: 443,
        certificates: [apiCert],
        defaultAction: elbv2.ListenerAction.forward([targetGroup]),
      })

      alb.addListener("HttpListener", {
        port: 80,
        defaultAction: elbv2.ListenerAction.redirect({
          protocol: "HTTPS",
          port: "443",
          permanent: true,
        }),
      })
    } else {
      alb.addListener("HttpListener", {
        port: 80,
        defaultAction: elbv2.ListenerAction.forward([targetGroup]),
      })
    }

    // ── Route 53 ───────────────────────────────────────────────────────────
    if (props.hostedZoneId) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
        this,
        "HostedZone",
        { hostedZoneId: props.hostedZoneId, zoneName: props.domainName }
      )

      new route53.ARecord(this, "ApiAliasRecord", {
        zone: hostedZone,
        recordName: props.apiSubdomain,
        target: route53.RecordTarget.fromAlias(
          new route53targets.LoadBalancerTarget(alb)
        ),
      })

      new route53.ARecord(this, "CdnAliasRecord", {
        zone: hostedZone,
        recordName: props.cdnSubdomain,
        target: route53.RecordTarget.fromAlias(
          new route53targets.CloudFrontTarget(distribution)
        ),
      })
    }

    // ── CloudWatch log group ───────────────────────────────────────────────
    new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: "/myartverse/api",
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // ── Outputs ────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "FrontendUrl", { value: frontendUrl })
    new cdk.CfnOutput(this, "ApiUrl", {
      value: useHttps ? `https://${apiDomain}` : `http://${alb.loadBalancerDnsName}`,
    })
    new cdk.CfnOutput(this, "CookieDomain", { value: cookieDomain })
    new cdk.CfnOutput(this, "CdnUrl", { value: `https://${cdnDomain}` })
    new cdk.CfnOutput(this, "AlbDnsName", { value: alb.loadBalancerDnsName })
    new cdk.CfnOutput(this, "EcrRepositoryUri", {
      value: repository.repositoryUri,
    })
    new cdk.CfnOutput(this, "UploadsBucketName", {
      value: uploadsBucket.bucketName,
    })
    new cdk.CfnOutput(this, "RdsSecretArn", {
      value: database.secret!.secretArn,
    })
    new cdk.CfnOutput(this, "AppSecretArn", { value: appSecret.secretArn })
    new cdk.CfnOutput(this, "Ec2InstanceId", { value: apiInstance.instanceId })
    new cdk.CfnOutput(this, "CloudFrontDistributionId", {
      value: distribution.distributionId,
    })
  }
}
