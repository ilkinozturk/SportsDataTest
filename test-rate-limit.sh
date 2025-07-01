#!/bin/bash

echo "Testing Rate Limiting..."
echo "Making 10 rapid requests to /api/health"

for i in {1..10}
do
    echo -n "Request $i: "
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health
    echo ""
done

echo -e "\nMaking 25 rapid requests to test rate limit..."
for i in {1..25}
do
    echo -n "Request $i: "
    response=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/health)
    status_code=$(echo "$response" | tail -n 1)
    
    if [ "$status_code" = "429" ]; then
        echo "RATE LIMIT HIT! (429)"
        echo "Response: $(echo "$response" | head -n -1 | jq .)"
        break
    else
        echo "$status_code"
    fi
done