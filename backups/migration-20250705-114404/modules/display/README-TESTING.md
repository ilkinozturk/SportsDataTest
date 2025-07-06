# Goals Display Module Testing with Real API Data

## Overview

Both test pages have been updated to use real API data from the backend server running on port 3005. No mocks are used - all data comes from the actual API.

## Test Pages

1. **test-goals-display.html** - Comprehensive test suite with automated tests
2. **simple-goals-display-test.html** - Simple interactive test page
3. **test-goals-display-fixed.html** - Backup version with mocks (if API is unavailable)

## How Real API Integration Works

### 1. API Client Configuration
```javascript
// public/js/modules/core/api-client.js
baseURL: 'http://localhost:3005/api'
```

### 2. Team Service
```javascript
// Loads team data from API
const teamService = window.TeamStatsTeamService;
const teamData = await teamService.getTeamData(teamId);
```

### 3. Available Team IDs for Testing
- **13** - FC Dallas (USA MLS)
- **836** - Real Madrid (if in current season)
- **15** - Manchester United (if in current season)
- **2673** - Other teams as available

## Testing Steps

### 1. Ensure Backend Server is Running
```bash
# Check if server is running on port 3005
curl http://localhost:3005/api/health

# If not running, start it:
cd /mnt/d/SportsData.ai
npm start
```

### 2. Open Test Page
```bash
# Open in browser
http://localhost:3005/test-goals-display.html
# or
http://localhost:3005/simple-goals-display-test.html
```

### 3. What to Expect

#### On Page Load:
1. Modules load and initialize
2. Team data is fetched from API (teamId: 13 - FC Dallas)
3. Real statistics are displayed in the demo section
4. Console shows: "Using real API data for tests"

#### Test Results:
- All tests run against real data structure
- Overview cards show actual team statistics
- Charts display real goals data
- Patterns analysis based on actual team performance

#### Interactive Features:
- **Filter buttons**: Switch between Overall/Home/Away stats
- **Randomize Data button**: Loads different teams from API
- **Performance Test**: Tests rendering with real data

## Debugging

### Check Console for:
```javascript
// Successful load
"Loading team data for team ID: 13"
"Team data loaded successfully: FC Dallas"
"Using real API data for tests"

// API issues
"Failed to load team data: [error]"
"Using mock data as fallback"
```

### Common Issues:

1. **Server not running**
   - Start server on port 3005
   - Check server logs: `tail -f server-test-3005.log`

2. **Team not found**
   - Team ID 3011 (Shanghai SIPG) returns 417 error
   - Use team ID 13 (FC Dallas) instead

3. **CORS issues**
   - Server should allow requests from same origin
   - Check browser console for CORS errors

## API Data Structure

Real data from API includes:
```javascript
{
    teamId: 13,
    teamName: "FC Dallas",
    stats: {
        matches: 34,
        wins: 10,
        draws: 5,
        losses: 19,
        goalsFor: 35,
        goalsAgainst: 53,
        cleanSheets: 6,
        failedToScore: 11,
        homeMatches: 17,
        homeGoalsFor: 19,
        homeGoalsAgainst: 21,
        // ... more statistics
    }
}
```

## Benefits of Real API Data

1. **Accurate Testing**: Tests run against actual data structures
2. **Real Performance**: See how module handles production data
3. **Edge Cases**: Discover issues with real-world data
4. **Live Updates**: Data reflects current season statistics

## Fallback to Mock Data

If API is unavailable, the system automatically falls back to mock data:
- Console shows: "Using mock data as fallback"
- Tests still run successfully
- Basic functionality is preserved

## Next Steps

1. Test with different team IDs
2. Monitor performance with real data
3. Check edge cases (teams with few matches, etc.)
4. Verify all statistics calculations are correct