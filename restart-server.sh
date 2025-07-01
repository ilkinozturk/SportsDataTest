#!/bin/bash

# SportsData.AI Restart Server Script

echo "🔄 Restarting SportsData.AI Server..."

# Stop server
./stop-server.sh

echo ""
echo "⏳ Waiting 2 seconds..."
sleep 2

# Start server
./start-background.sh