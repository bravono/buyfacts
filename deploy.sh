#!/bin/bash
# Deploy the staging branch to the staging/production server.
#
# NOTE: `prisma migrate dev` is a development command: it can prompt to reset the
# database and it writes new migration files on the server. Deployments use
# `prisma migrate deploy`, which only applies migrations that are already in the
# repo, never prompts, and never resets data.
#
# Any step that fails stops the deployment, so a half-migrated or half-built app
# is never left running.
set -euo pipefail

echo "Starting deployment from staging branch..."

cd /var/www/buyfacts || exit 1
git fetch origin
git checkout staging
git pull origin staging

npm install

# Apply committed migrations only — no prompts, no data reset, no schema drift.
npx prisma migrate deploy

npx prisma generate

npm run build

pm2 restart buyfacts

echo "Deployment from staging branch finished successfully!"
