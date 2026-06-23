#!/usr/bin/env bash
# Request an ACM certificate and print DNS records to add in Vercel (or your DNS).
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
DOMAIN="${1:-api.myartverse.dev}"

echo "==> Requesting ACM certificate for $DOMAIN in $REGION..."
ARN=$(aws acm request-certificate \
  --region "$REGION" \
  --domain-name "$DOMAIN" \
  --validation-method DNS \
  --query CertificateArn \
  --output text)

echo "Certificate ARN: $ARN"
echo ""
echo "Waiting a few seconds for validation records..."
sleep 5

aws acm describe-certificate \
  --region "$REGION" \
  --certificate-arn "$ARN" \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output table

echo ""
echo "Add the CNAME above in Vercel → myartverse.dev → DNS."
echo "Wait until status is ISSUED:"
echo "  aws acm describe-certificate --region $REGION --certificate-arn $ARN --query Certificate.Status"
echo ""
echo "Then add API CNAME in Vercel:"
ALB=$(aws cloudformation describe-stacks --stack-name MyArtverseStack --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='AlbDnsName'].OutputValue" --output text)
echo "  Name: api   Value: $ALB   (or use subdomain $DOMAIN → $ALB)"
echo ""
echo "Redeploy with HTTPS:"
echo "  cd infra && npm run deploy -- -c certificateArn=$ARN"
