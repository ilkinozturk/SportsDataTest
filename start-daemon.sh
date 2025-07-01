#!/bin/bash

# SportsData.AI Daemon Script (Production Mode)
# Bu script servisi arka planda daemon olarak çalıştırır

echo "🔧 SportsData.AI Production Daemon"
echo "📁 Working Directory: $(pwd)"

# PM2 kurulu mu kontrol et
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Mevcut PM2 processlerini kontrol et
if pm2 list | grep -q "sportsdata-ai"; then
    echo "🔄 Restarting existing daemon..."
    pm2 restart sportsdata-ai
else
    echo "🚀 Starting new daemon..."
    pm2 start simple-server-optimized.js --name sportsdata-ai --watch --ignore-watch="node_modules logs *.log"
fi

echo ""
echo "✅ Daemon started successfully!"
echo "📊 Status: pm2 status"
echo "📋 Logs: pm2 logs sportsdata-ai"
echo "🛑 Stop: pm2 stop sportsdata-ai"
echo "🗑️  Delete: pm2 delete sportsdata-ai"
echo "🔄 Restart: pm2 restart sportsdata-ai"
echo ""

# Status göster
pm2 status