#!/usr/bin/env bash
# Pull the plug on MyArtverse AWS resources.
#
# Usage:
#   ./infra/scripts/teardown.sh pause     # Stop EC2 + RDS (~$30/mo savings, keeps infra)
#   ./infra/scripts/teardown.sh resume    # Start EC2 + RDS again
#   ./infra/scripts/teardown.sh destroy   # Delete the entire CDK stack
#
set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
STACK_NAME="${STACK_NAME:-MyArtverseStack}"
ACTION="${1:-}"

usage() {
  echo "Usage: $0 {pause|resume|destroy}"
  exit 1
}

stack_output() {
  aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" \
    --output text 2>/dev/null || true
}

rds_instance_id() {
  aws cloudformation describe-stack-resources \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "StackResources[?ResourceType=='AWS::RDS::DBInstance'].PhysicalResourceId" \
    --output text 2>/dev/null || true
}

pause_stack() {
  INSTANCE_ID="$(stack_output Ec2InstanceId)"
  DB_ID="$(rds_instance_id)"

  if [[ -n "$INSTANCE_ID" && "$INSTANCE_ID" != "None" ]]; then
    echo "==> Stopping EC2: $INSTANCE_ID"
    aws ec2 stop-instances --region "$REGION" --instance-ids "$INSTANCE_ID"
  else
    echo "WARN: EC2 instance not found (stack may not be deployed)"
  fi

  if [[ -n "$DB_ID" && "$DB_ID" != "None" ]]; then
    echo "==> Stopping RDS: $DB_ID"
    aws rds stop-db-instance --region "$REGION" --db-instance-identifier "$DB_ID" || true
  fi

  echo "==> Paused. NAT Gateway + ALB still bill (~\$55/mo). Use 'destroy' to remove those."
}

resume_stack() {
  INSTANCE_ID="$(stack_output Ec2InstanceId)"
  DB_ID="$(rds_instance_id)"

  if [[ -n "$DB_ID" && "$DB_ID" != "None" ]]; then
    echo "==> Starting RDS: $DB_ID"
    aws rds start-db-instance --region "$REGION" --db-instance-identifier "$DB_ID" || true
    echo "    Waiting for RDS to become available..."
    aws rds wait db-instance-available --region "$REGION" --db-instance-identifier "$DB_ID"
  fi

  if [[ -n "$INSTANCE_ID" && "$INSTANCE_ID" != "None" ]]; then
    echo "==> Starting EC2: $INSTANCE_ID"
    aws ec2 start-instances --region "$REGION" --instance-ids "$INSTANCE_ID"
    aws ec2 wait instance-running --region "$REGION" --instance-ids "$INSTANCE_ID"
  fi

  echo "==> Resumed."
}

destroy_stack() {
  echo "==> Destroying CloudFormation stack: $STACK_NAME"
  echo "    RDS will create a final snapshot, then delete."
  echo "    S3 bucket + ECR repo are RETAINED (delete manually if needed)."
  read -r -p "Type 'destroy' to confirm: " confirm
  if [[ "$confirm" != "destroy" ]]; then
    echo "Aborted."
    exit 1
  fi

  cd "$(dirname "$0")/.."
  npx cdk destroy "$STACK_NAME" --force

  echo "==> Stack destroyed."
  echo "    Manual cleanup (if desired):"
  echo "      - S3 bucket: aws s3 rb s3://myartverse-uploads-ACCOUNT_ID --force"
  echo "      - ECR repo:  aws ecr delete-repository --repository-name myartverse-api --force"
  echo "      - RDS snapshots in RDS console"
}

case "$ACTION" in
  pause) pause_stack ;;
  resume) resume_stack ;;
  destroy) destroy_stack ;;
  *) usage ;;
esac
