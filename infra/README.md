# MyArtverse AWS Infrastructure

CDK stack for the **myartverse.app** API with the **Vercel** frontend at **dev.myartverse.app**.

## Architecture

| Service | URL |
|---------|-----|
| Frontend (Vercel) | `https://dev.myartverse.app` |
| API (ALB + EC2) | `https://api.myartverse.app` |
| CDN (uploads) | `https://cdn.myartverse.app` |

CORS allows `https://dev.myartverse.app`. Auth cookies are scoped to `.myartverse.app` (the API domain) and sent on cross-origin requests to `api.myartverse.app` when the frontend uses `credentials: 'include'`.

## What gets created

| Resource | Purpose |
|----------|---------|
| VPC `10.252.254.0/25` | Public, private-app, private-db subnets (2 AZ) |
| EC2 `t3.small` | Runs API Docker container on port 8081 |
| RDS PostgreSQL 16 | `db.t4g.micro`, encrypted, private subnet |
| S3 | Private uploads bucket |
| CloudFront | Public CDN at `cdn.myartverse.app` |
| ALB | HTTPS for `api.myartverse.app` |
| ECR | `myartverse-api` container registry |
| Secrets Manager | RDS credentials + app config |
| IAM | EC2 instance profile (S3, ECR, SSM, secrets) |

## Prerequisites

1. AWS CLI configured (`aws sts get-caller-identity`)
2. Node.js 20+
3. Docker
4. Route 53 hosted zone for `myartverse.app` (recommended)

Bootstrap CDK once per account/region:

```bash
cd infra
npm install
npx cdk bootstrap aws://ACCOUNT_ID/us-east-2
```

**Region must match:** if you bootstrap `us-east-2`, set `"region": "us-east-2"` in `cdk.json` (already set). Bootstrapping one region does not work in another.

## Deploy infrastructure

**No Route 53 zone yet?** Deploy without `hostedZoneId` — you get an ALB URL over HTTP, then add DNS later:

```bash
cd infra
npm run deploy
```

With Route 53 (auto DNS + ACM certificates for `api.myartverse.app`):

```bash
cd infra
npm run deploy -- -c hostedZoneId=Z0123456789ABCDEFGHIJ
```

Find your zone (empty result means the domain is not in Route 53 yet):

```bash
aws route53 list-hosted-zones-by-name --dns-name myartverse.app
```

## Configure secrets

After the stack deploys, update the app secret with real values:

```bash
aws secretsmanager put-secret-value \
  --secret-id myartverse/app/config \
  --secret-string '{
    "MA_JWT_SECRET": "your-long-random-secret",
    "MA_COOKIE_SECRET": "your-cookie-secret",
    "MA_SESSION_SECRET": "your-session-secret",
    "RESEND_API_KEY": "re_xxx",
    "GOOGLE_CLIENT_ID": "xxx",
    "GOOGLE_CLIENT_SECRET": "xxx",
    "FACEBOOK_CLIENT_ID": "xxx",
    "FACEBOOK_CLIENT_SECRET": "xxx"
  }'
```

## Build and deploy the API

```bash
chmod +x infra/scripts/deploy-api.sh
./infra/scripts/deploy-api.sh
```

This builds the Docker image, pushes to ECR, and restarts the container on EC2.

## Stack outputs

| Output | Example |
|--------|---------|
| `ApiUrl` | `https://api.myartverse.app` |
| `CdnUrl` | `https://cdn.myartverse.app` |
| `EcrRepositoryUri` | `123456789.dkr.ecr.us-east-1.amazonaws.com/myartverse-api` |
| `Ec2InstanceId` | `i-0abc123...` |

## OAuth & Resend

Register these in provider consoles:

- Google redirect: `https://api.myartverse.app/v1/auth/google/callback`
- Facebook redirect: `https://api.myartverse.app/v1/auth/facebook/callback`
- Google authorized JavaScript origin (if needed): `https://dev.myartverse.app`
- Verify `myartverse.app` in Resend for `noreply@myartverse.app`

## Vercel frontend

Set in the Vercel project environment:

```bash
NEXT_PUBLIC_API_URL=https://api.myartverse.app
```

All API requests from the frontend must use `credentials: 'include'` so auth cookies from `api.myartverse.app` are sent.

## Shell access (no SSH)

```bash
aws ssm start-session --target <Ec2InstanceId>
```

## Tear down / pause

```bash
chmod +x infra/scripts/teardown.sh

# Stop EC2 + RDS (saves ~$30/mo; NAT + ALB still run ~$55/mo)
./infra/scripts/teardown.sh pause

# Start again
./infra/scripts/teardown.sh resume

# Full delete (RDS → final snapshot; S3 + ECR retained)
./infra/scripts/teardown.sh destroy
```

Or destroy directly with CDK:

```bash
cd infra && npx cdk destroy MyArtverseStack --force
```

RDS creates a final snapshot on destroy. S3 bucket and ECR repo are **retained** — delete manually if you want zero trace.
