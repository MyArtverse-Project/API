    #!/usr/bin/env bash
# Regenerate /opt/myartverse/.env from Secrets Manager (run on EC2 or via SSM).
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
RDS_SECRET_ARN="${RDS_SECRET_ARN:?RDS_SECRET_ARN required}"
APP_SECRET_ARN="${APP_SECRET_ARN:?APP_SECRET_ARN required}"
S3_BUCKET="${S3_BUCKET:?S3_BUCKET required}"
CDN_URL="${CDN_URL:-https://cdn.myartverse.app}"
API_URL="${API_URL:?API_URL required}"
FRONTEND_URL="${FRONTEND_URL:-https://dev.myartverse.app}"
FRONTEND_DOMAIN="${FRONTEND_DOMAIN:-dev.myartverse.app}"
COOKIE_DOMAIN="${COOKIE_DOMAIN:-.myartverse.app}"

mkdir -p /opt/myartverse

RDS_JSON=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$RDS_SECRET_ARN" --query SecretString --output text)
APP_JSON=$(aws secretsmanager get-secret-value --region "$REGION" --secret-id "$APP_SECRET_ARN" --query SecretString --output text)

jq -nr --argjson rds "$RDS_JSON" --argjson app "$APP_JSON" \
  --arg bucket "$S3_BUCKET" --arg cdn "$CDN_URL" --arg api "$API_URL" \
  --arg frontend "$FRONTEND_URL" --arg domain "$COOKIE_DOMAIN" \
  --arg frontendDomain "$FRONTEND_DOMAIN" --arg region "$REGION" \
  '$app + {
    NODE_ENV: "production",
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
  } | to_entries | .[] | "\(.key)=\(.value)"' > /opt/myartverse/.env

echo "Wrote /opt/myartverse/.env ($(wc -l < /opt/myartverse/.env) lines)"
