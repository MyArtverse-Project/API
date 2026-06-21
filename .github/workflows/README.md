# GitHub Actions

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | PR + push to `prod`/`main` | Build + lint |
| **Deploy API** | Push to `prod` (app paths) or manual | Build Docker → ECR → EC2 |
| **Deploy Infrastructure** | Manual only | CDK stack update |

## Required secrets

Add in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

### IAM policy for deploy user

Attach a policy like this to the IAM user:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudformation:DescribeStacks"],
      "Resource": "arn:aws:cloudformation:us-east-2:414061810268:stack/MyArtverseStack/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:ListCommandInvocations"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudformation:*", "iam:*", "ec2:*", "rds:*", "s3:*", "elasticloadbalancing:*", "acm:*", "secretsmanager:*", "ecr:*", "logs:*", "cloudfront:*"],
      "Resource": "*",
      "Condition": {
        "StringEquals": { "aws:RequestedRegion": "us-east-2" }
      }
    }
  ]
}
```

The infra deploy statement is only needed if you run **Deploy Infrastructure**. The API deploy workflow needs ECR, CloudFormation DescribeStacks, and SSM.

## Usage

**Automatic API deploy** — merge to `prod`:

```bash
git push origin prod
```

**Manual API deploy** — Actions → Deploy API → Run workflow

**Infra deploy** (HTTPS cert, stack changes) — Actions → Deploy Infrastructure → Run workflow

Optional inputs for HTTPS:

- `certificate_arn`: `arn:aws:acm:us-east-2:414061810268:certificate/6d220b89-...`
- `api_hostname`: `api.myartverse.app`
- `cookie_domain`: `.myartverse.app`
