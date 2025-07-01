# FootyStats API Standings Analysis Report

## Problem Summary

The FootyStats API is returning incorrect team positions for Chicago Fire:

- **Current API Response**: Position 0 (converted to 1/30)
- **Expected Position**: 17/30 according to user
- **Team Statistics**: 18 matches played, 1.39 PPG (confirmed in team endpoint)
- **Issue**: All teams in league-teams endpoint show position 0 and stats 0

## Key Findings

### 1. Data Inconsistency Between Endpoints

**Team Endpoint (`/team`)**:

- ✅ Returns Chicago Fire with PPG: 1.39
- ✅ Shows 18 matches played
- ✅ Shows valid season: 2025
- ❌ Returns table_position: 0

**League-Teams Endpoint (`/league-teams`)**:

- ❌ All teams show PPG: 0
- ❌ All teams show matches: 0
- ❌ All teams show table_position: 0
- **Exception**: With `include=stats` parameter, Chicago Fire shows PPG: 1.39

### 2. Working Solution Found

**Critical Discovery**: The parameter `include=stats` on the `/league-teams`
endpoint returns actual statistics:

```javascript
// This works and returns real PPG data
const response = await axios.get(`${BASE_URL}/league-teams`, {
  params: {
    key: API_KEY,
    league_id: 13973,
    include: 'stats', // This is the key!
  },
});
```

### 3. Alternative Approaches Tested

#### Season-Specific Parameters

- ❌ `season=current`, `season=2025`, `live=true` - No effect
- ❌ `latest=true`, `fresh=true`, `updated=true` - No effect

#### Alternative League IDs

- Found 3 MLS 2025 leagues: 13973, 14180, 14551
- Only 13973 returns data (others return 417 errors)
- 13973 appears to be the correct current MLS league

#### Hidden Endpoints

- ❌ `/league-table`, `/standings`, `/current-standings` - All return 404
- ❌ `/season-table`, `/competition-table` - All return 404

## Recommended Solutions

### 1. Immediate Fix: Use `include=stats` Parameter

Modify the league-teams API call to include the `include=stats` parameter:

```javascript
// Current implementation in teamDataService.js (line ~199)
const response = await axios.get(`${this.baseUrl}/league-teams`, {
  params: {
    key: this.apiKey,
    league_id: leagueInfo.id,
    include: 'stats', // Add this parameter
  },
  timeout: 10000,
});
```

### 2. Enhanced Position Calculation

The existing code in `teamDataService.js` already implements good position
calculation logic (lines 236-253):

```javascript
// Sort teams by PPG to get accurate standings
const sortedTeams = [...teams].sort((a, b) => {
  // Primary sort by PPG
  const ppgA = a.stats?.seasonPPG_overall || 0;
  const ppgB = b.stats?.seasonPPG_overall || 0;
  if (ppgB !== ppgA) return ppgB - ppgA;

  // Secondary sort by total points
  const pointsA = a.stats?.seasonPoints_overall || 0;
  const pointsB = b.stats?.seasonPoints_overall || 0;
  if (pointsB !== pointsA) return pointsB - pointsA;

  // Tertiary sort by goal difference
  const gdA = a.stats?.seasonGoalDifference_overall || 0;
  const gdB = b.stats?.seasonGoalDifference_overall || 0;
  return gdB - gdA;
});
```

**Issue**: This code may not execute if the `include=stats` parameter is
missing.

### 3. Data Validation Improvements

Add validation to detect when API data is incomplete:

```javascript
// In teamDataService.js getLeaguePosition method
const hasValidStats = teams.some(
  t =>
    (t.stats?.seasonPPG_overall || 0) > 0 ||
    (t.stats?.seasonMatchesPlayed_overall || 0) > 0
);

if (!hasValidStats) {
  console.warn(
    '⚠️ No teams have valid statistics - using include=stats parameter'
  );
  // Retry with include=stats parameter
}
```

### 4. API Parameter Configuration

Create a configuration object for API parameters:

```javascript
// In services/footyStatsAPI.js or teamDataService.js
const API_PARAMS = {
  LEAGUE_TEAMS: {
    include: 'stats', // Ensures statistics are returned
    // Add other working parameters as discovered
  },
};
```

## Implementation Priority

### High Priority (Immediate)

1. **Add `include=stats` parameter** to all `/league-teams` calls
2. **Test Chicago Fire position** with this parameter
3. **Verify calculated position** matches expected ~17th place

### Medium Priority (Next Sprint)

1. **Implement data validation** to detect missing statistics
2. **Add retry logic** with different parameters if initial call fails
3. **Enhanced error handling** for incomplete data responses

### Low Priority (Future)

1. **Alternative data sources** as fallback
2. **Contact FootyStats support** about data consistency
3. **Implement caching** with data freshness indicators

## Testing Results Summary

| Method                    | Result       | Notes                               |
| ------------------------- | ------------ | ----------------------------------- |
| `include=stats` parameter | ✅ **WORKS** | Returns Chicago Fire PPG: 1.39      |
| Alternative league IDs    | ❌ Failed    | Other MLS leagues return 417 errors |
| Hidden endpoints          | ❌ Failed    | All return 404 errors               |
| Season parameters         | ❌ Failed    | No effect on data quality           |
| Team endpoint             | ✅ Partial   | Returns stats but position still 0  |

## Code Changes Required

### File: `/mnt/d/SportsData.Ai/services/teamDataService.js`

**Line ~199-205**: Modify the league-teams API call

```javascript
// ADD include=stats parameter
const response = await axios.get(`${this.baseUrl}/league-teams`, {
  params: {
    key: this.apiKey,
    league_id: leagueInfo.id,
    include: 'stats', // Add this line
  },
  timeout: 10000,
});
```

### File: `/mnt/d/SportsData.Ai/simple-server-optimized.js`

**Line ~613-616**: Modify standings endpoint

```javascript
const response = await axios.get(`${BASE_URL}/league-teams`, {
  params: {
    key: API_KEY,
    league_id: leagueId,
    include: 'stats', // Add this line
  },
  timeout: 10000,
});
```

## Expected Outcome

With the `include=stats` parameter:

- Chicago Fire should show realistic PPG (1.39 confirmed)
- Position calculation should work correctly based on PPG sorting
- Chicago Fire should appear in 15-20th position range as expected
- All other teams should also show valid statistics

## Next Steps

1. **Implement the `include=stats` parameter** in the identified files
2. **Test with Chicago Fire** to verify correct position calculation
3. **Monitor for any other teams** with similar position discrepancies
4. **Consider implementing** additional parameter testing for future API
   improvements
