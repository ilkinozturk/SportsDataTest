#!/bin/bash

# SportsData.AI Stop Server Script

echo "🛑 Stopping SportsData.AI Server..."

# PID dosyasından PID oku
if [ -f "logs/server.pid" ]; then
    PID=$(cat logs/server.pid)
    echo "📋 Found PID: $PID"
    
    if ps -p $PID > /dev/null; then
        echo "🔴 Stopping server (PID: $PID)..."
        kill $PID
        sleep 2
        
        if ps -p $PID > /dev/null; then
            echo "💥 Force killing server..."
            kill -9 $PID
        fi
        
        rm -f logs/server.pid
        echo "✅ Server stopped successfully!"
    else
        echo "⚠️  Process already stopped"
        rm -f logs/server.pid
    fi
else
    echo "🔍 No PID file found, killing all related processes..."
    pkill -f "simple-server-optimized.js"
    echo "✅ All related processes killed"
fi

echo "📊 Current processes:"
ps aux | grep "simple-server-optimized" | grep -v grep || echo "No running processes found"