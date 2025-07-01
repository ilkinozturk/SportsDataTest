#!/bin/bash

echo "🧹 Clearing all caches and restarting server..."

# Stop the server
echo "⏹️  Stopping server..."
pkill -f "node.*simple-server" || true
sleep 2

# Clear any file-based caches (if any)
echo "🗑️  Clearing file caches..."
rm -rf /tmp/sports-data-cache/* 2>/dev/null || true
rm -rf ./cache/* 2>/dev/null || true

# Clear Node.js module cache
echo "🔄 Clearing Node.js cache..."
npm cache clean --force 2>/dev/null || true

# Start the server with environment variable
echo "🚀 Starting server with API key..."
cd /mnt/d/SportsData.Ai

# Export the API key and start server
export FOOTYSTATS_API_KEY=29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9
npm run start:auto

echo "✅ Server restarted with cleared caches"