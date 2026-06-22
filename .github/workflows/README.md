# GitHub Actions

Automated CI and deploy for the MyArtverse API.

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | PR + push to `prod` / `main` | API build + lint; CDK synth |
| **Deploy API** | Push to `prod` (app paths) or manual | Docker → ECR → EC2 |
| **Deploy Infrastructure** | Manual only | CDK stack update |

## Setup (one time)

### 1. GitHub secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

### 2. IAM user

Create user `github-actions-myartverse` in IAM. Attach **one** of the policies below.

#### Policy A — Deploy API only (recommended)

Use this if you only run **Deploy API** from GitHub.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRLogin",
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Sid": "ECRPush",
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "arn:aws:ecr:us-east-2:414061810268:repository/myartverse-api"
    },
    {
      "Sid": "StackOutputs",
      "Effect": "Allow",
      "Action": "cloudformation:DescribeStacks",
      "Resource": "arn:aws:cloudformation:us-east-2:414061810268:stack/MyArtverseStack/*"
    },
    {
      "Sid": "DeployOnEc2",
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:ListCommandInvocations"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudFrontCdnUrl",
      "Effect": "Allow",
      "Action": "cloudfront:GetDistribution",
      "Resource": "arn:aws:cloudfront::414061810268:distribution/*"
    }
  ]
}
```

Replace `414061810268` with your AWS account ID if different.

#### Policy B — Deploy Infrastructure (CDK)

Add this **in addition to Policy A** only if you run **Deploy Infrastructure** from Actions. Prefer running CDK from your laptop with admin/SSO instead.

```json
{
  "Sid": "CDKDeploy",
  "Effect": "Allow",
  "Action": [
    "cloudformation:*",
    "iam:*",
    "ec2:*",
    "rds:*",
    "s3:*",
    "elasticloadbalancing:*",
    "acm:*",
    "secretsmanager:*",
    "ecr:*",
    "logs:*",
    "cloudfront:*",
    "ssm:*",
    "route53:*"
  ],
  "Resource": "*",
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": "us-east-2"
    }
  }
}
```

### 3. App secrets (not GitHub)

Runtime config (JWT, Sentry, Resend, OAuth) lives in **AWS Secrets Manager** (`myartverse/app/config`). Deploy API refreshes EC2 `.env` from there — no GitHub secrets needed for those.

## Usage

### Automatic API deploy

Merge or push to **`prod`** when these paths change:

- `src/**`, `Dockerfile`, `package.json`, `yarn.lock`, `infra/scripts/**`, etc.

```bash
git push origin prod
```

### Manual API deploy

**Actions → Deploy API → Run workflow**

Optional inputs:

- `frontend_url` — default `https://dev.myartverse.app`
- `frontend_domain` — default `dev.myartverse.app`

### Manual infra deploy

**Actions → Deploy Infrastructure → Run workflow**

Optional inputs:

- `certificate_arn` — ACM cert for HTTPS on ALB
- `api_hostname` — `api.myartverse.app`
- `cookie_domain` — `.myartverse.app`
- `frontend_domain` — `dev.myartverse.app`

## What each workflow does

### CI

- `yarn build` + `yarn lint` on the API
- `cdk synth` on infra (validates CloudFormation without deploying)

### Deploy API

1. Configure AWS credentials from GitHub secrets
2. Run `infra/scripts/deploy-api.sh`:
   - Build Docker image on the runner
   - Push to ECR
   - SSM command on EC2: refresh `.env`, pull image, restart container
3. Curl `/health` until OK

### Deploy Infrastructure

1. `npm ci` in `infra/`
2. `cdk deploy MyArtverseStack` with context from workflow inputs

## Troubleshooting

| Failure | Likely cause |
|---------|----------------|
| `Credentials could not be loaded` | Missing or wrong GitHub secrets |
| `AccessDenied` on `ecr:*` | IAM Policy A incomplete |
| `AccessDenied` on `ssm:*` | Missing SSM permissions |
| SSM command failed | Check EC2 instance id in stack; SSM agent running |
| Health check failed | Container crash — `docker logs myartverse-api` on EC2 |
| CI CDK synth fails | Run `npm ci` in `infra/` locally; fix TypeScript errors |
