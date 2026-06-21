#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REGION="${AWS_REGION:-us-east-2}"
STACK_NAME="${STACK_NAME:-MyArtverseStack}"

echo "==> Resolving ECR repository from stack outputs..."
ECR_URI=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='EcrRepositoryUri'].OutputValue" \
  --output text)

if [[ -z "$ECR_URI" || "$ECR_URI" == "None" ]]; then
  echo "Error: EcrRepositoryUri not found. Deploy infra first: cd infra && npm run deploy"
  exit 1
fi

echo "==> Logging in to ECR ($ECR_URI)..."
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "${ECR_URI%%/*}"

echo "==> Building Docker image..."
docker build --platform linux/amd64 -t myartverse-api:latest "$ROOT_DIR"

echo "==> Pushing to ECR..."
docker tag myartverse-api:latest "$ECR_URI:latest"
docker push "$ECR_URI:latest"

INSTANCE_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='Ec2InstanceId'].OutputValue" \
  --output text)

echo "==> Restarting API on EC2 ($INSTANCE_ID) via SSM..."
aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Redeploy MyArtverse API" \
  --parameters commands="[
    \"aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR_URI%%/*}\",
    \"docker pull $ECR_URI:latest\",
    \"docker rm -f myartverse-api || true\",
    \"docker run -d --name myartverse-api --restart always --env-file /opt/myartverse/.env -p 8081:8081 $ECR_URI:latest\"
  ]" \
  --output text

echo "==> Done. API image pushed and EC2 restart initiated."
