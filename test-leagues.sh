#!/bin/bash

echo "=== Testing Team Data from Different Leagues ==="
echo ""

# Function to test a team
test_team() {
    local team_id=$1
    local team_name=$2
    local expected_league=$3
    
    echo "Testing $team_name (ID: $team_id) - Expected: $expected_league"
    
    # Get team data
    response=$(curl -s http://localhost:3001/api/team/$team_id)
    
    # Extract key fields
    league_name=$(echo "$response" | grep -o '"league":{[^}]*}' | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    position_text=$(echo "$response" | grep -o '"positionText":"[^"]*"' | cut -d'"' -f4)
    wins=$(echo "$response" | grep -o '"wins":[0-9]*' | grep -o '[0-9]*')
    clean_sheets=$(echo "$response" | grep -o '"cleanSheets":[0-9]*' | grep -o '[0-9]*' | head -1)
    
    echo "  - League: $league_name"
    echo "  - Position: $position_text"
    echo "  - Wins: $wins"
    echo "  - Clean Sheets: $clean_sheets"
    
    # Check if data looks correct
    if [[ "$position_text" == *"/0"* ]] || [[ "$position_text" == "N/A" ]]; then
        echo "  ❌ ISSUE: Position shows $position_text"
    else
        echo "  ✅ Position format looks correct"
    fi
    
    echo ""
}

# Test teams from different leagues
test_team 7 "Chicago Fire" "USA MLS"
test_team 836 "Shanghai SIPG" "China Chinese Super League"
test_team 834 "Kashima Antlers" "Japan J1 League"
test_team 842 "Rosenborg" "Norway Eliteserien"
test_team 1153 "HJK Helsinki" "Finland Veikkausliiga"
test_team 1488 "FK Liepaja" "Latvia Virsliga"
test_team 12 "Inter Miami CF" "USA MLS"
test_team 19 "Orlando City" "USA MLS"

echo "=== Test Complete ==="