#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/pc-teklif-v1"

cd "$APP_DIR"
git pull origin main
npm install
npm run build
pm2 restart pc-teklif-api
systemctl reload nginx

echo "Deploy tamamlandi."
