#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
REGION="${AWS_REGION:-us-east-2}"
STACK_NAME="${STACK_NAME:-MyArtverseStack}"

stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text
}

echo "==> Resolving ECR repository from stack outputs..."
ECR_URI=$(stack_output EcrRepositoryUri)

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

INSTANCE_ID=$(stack_output Ec2InstanceId)
RDS_SECRET_ARN=$(stack_output RdsSecretArn)
APP_SECRET_ARN=$(stack_output AppSecretArn)
S3_BUCKET=$(stack_output UploadsBucketName)
API_URL=$(stack_output ApiUrl)
FRONTEND_URL="${FRONTEND_URL:-$(stack_output FrontendUrl)}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-${FRONTEND_URL#https://}}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN%%/*}"
CDN_URL=$(stack_output CdnUrl)
COOKIE_DOMAIN=$(stack_output CookieDomain)
COOKIE_DOMAIN="${COOKIE_DOMAIN:-.myartverse.app}"

REFRESH_ENV_B64=$(base64 < "$(dirname "$0")/refresh-env.sh" | tr -d '\n')

echo "==> Refreshing .env and restarting API on EC2 ($INSTANCE_ID)..."
COMMAND_ID=$(aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "Redeploy MyArtverse API" \
  --parameters "commands=[
    \"echo $REFRESH_ENV_B64 | base64 -d > /tmp/refresh-env.sh\",
    \"chmod +x /tmp/refresh-env.sh\",
    \"RDS_SECRET_ARN=$RDS_SECRET_ARN APP_SECRET_ARN=$APP_SECRET_ARN S3_BUCKET=$S3_BUCKET API_URL=$API_URL FRONTEND_URL=$FRONTEND_URL FRONTEND_DOMAIN=$FRONTEND_DOMAIN CDN_URL=$CDN_URL COOKIE_DOMAIN=$COOKIE_DOMAIN AWS_REGION=$REGION /tmp/refresh-env.sh\",
    \"aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin ${ECR_URI%%/*}\",
    \"docker pull $ECR_URI:latest\",
    \"docker rm -f myartverse-api || true\",
    \"docker run -d --name myartverse-api --restart always --env-file /opt/myartverse/.env -p 8081:8081 $ECR_URI:latest\"
  ]" \
  --query Command.CommandId \
  --output text)

echo "==> Waiting for SSM command $COMMAND_ID..."
aws ssm wait command-executed \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID"

STATUS=$(aws ssm get-command-invocation \
  --region "$REGION" \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_ID" \
  --query Status \
  --output text)

if [[ "$STATUS" != "Success" ]]; then
  aws ssm get-command-invocation \
    --region "$REGION" \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID" \
    --query StandardErrorContent \
    --output text
  echo "Error: SSM deploy failed with status $STATUS"
  exit 1
fi

echo "==> Done. API deployed successfully."
