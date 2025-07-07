#!/bin/bash

# SportsData.AI Background Server Script
# Bu script servisi background'da çalıştırır

echo "🚀 SportsData.AI Background Server"
echo "📁 Working Directory: $(pwd)"

# Mevcut processleri öldür
pkill -f "simple-server-optimized.js" 2>/dev/null

# Logs dizini oluştur
mkdir -p logs

echo "🔄 Starting server in background..."
echo "🌐 Server will be available at: http://localhost:3005"
echo "📝 Logs: tail -f logs/server.log"
echo "🛑 Stop: pkill -f simple-server-optimized.js"
echo ""

# Background'da çalıştır
nohup node simple-server-optimized.js > logs/server.log 2>&1 &
SERVER_PID=$!

echo "✅ Server started with PID: $SERVER_PID"
echo "📊 Process status:"
ps aux | grep $SERVER_PID | grep -v grep

# PID'i kaydet
echo $SERVER_PID > logs/server.pid

echo ""
echo "🔍 Checking server status in 3 seconds..."
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo "✅ Server is running successfully!"
    echo "📋 Logs: tail -f logs/server.log"
    tail -5 logs/server.log
else
    echo "❌ Server failed to start. Check logs:"
    cat logs/server.log
fi