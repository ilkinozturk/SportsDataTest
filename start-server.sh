#!/bin/bash

# SportsData.AI Auto-Start Script
# Bu script servisi otomatik olarak başlatır ve dosya değişikliklerini izler

echo "🚀 SportsData.AI Server Starting..."
echo "📁 Working Directory: $(pwd)"

# Port kontrolü
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $PORT is already in use. Killing existing process..."
    PID=$(lsof -t -i:$PORT)
    kill -9 $PID 2>/dev/null
    sleep 2
fi

# Node.js versiyonu kontrolü
echo "🔍 Node.js version: $(node --version)"
echo "📦 NPM version: $(npm --version)"

# Dependencies kontrolü
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🔄 Starting server with auto-restart..."
echo "🌐 Server will be available at: http://localhost:3000"
echo "📝 Watching for file changes in: .js, .html, .json files"
echo "🛑 Press Ctrl+C to stop"
echo ""

# Nodemon ile serveri başlat
npm run start:auto