#!/bin/bash
echo "Starting deployment from staging branch..."

cd /var/www/buyfacts || exit
git fetch origin
git checkout staging
git pull origin staging

npm install

npm run build

pm2 restart next-app

echo "Deployment from staging branch finished successfully!"
