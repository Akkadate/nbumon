#!/bin/bash
set -e

APP_DIR="/var/www/nbumon"
APP_NAME="nbumon"

echo "=============================="
echo " NBU Student Monitoring Deploy"
echo "=============================="

cd "$APP_DIR"

echo "[1/3] Pulling latest code..."
git pull origin main

echo "[2/3] Building..."
npm run build

echo "[3/3] Restarting PM2..."
pm2 restart "$APP_NAME"

echo ""
echo "✓ Deploy complete!"
pm2 status "$APP_NAME"
