# Team Endpoint Optimization Analysis

## Current Data Flow

### 1. Where is the /team endpoint called?

The `/team` endpoint is called in multiple places:

1. **teamDataService.js**
   - Line 293: `fetchAllCompetitionData()` - Initial team data fetch
   - Line 406: `fetchTeamStats()` - Main team stats fetch with season_id
   - Line 422: `fetchTeamStats()` - Fallback without season_id

2. **Other services calling /team**:
   - CompetitionTypeResolver.js
   - DynamicTeamLeagueResolver.js
   - TeamSearchService.js
   - UniversalMappingService.js
   - matchesService.js

### 2. What data do we actually need from /team endpoint?

From analyzing `teamDataService.js`, the essential data needed includes:

```javascript
// From extractTeamInfo() - line 443
- id
- name / full_name / english_name
- image / logo / crest / badge_url
- country
- founded
- season
- competition_id
- risk
- performance_rank

// From processStatistics() - line 859
- stats object with all statistics:
  - seasonMatchesPlayed_overall/home/away
  - seasonWinsNum_overall/home/away
  - seasonDrawsNum_overall/home/away
  - seasonLossesNum_overall/home/away
  - seasonPoints_overall
  - seasonPPG_overall/home/away
  - seasonGoals_overall, seasonConceded_overall
  - seasonGoalDifference_overall/home/away
  - seasonScoredAVG_overall/home/away
  - seasonConcededAVG_overall/home/away
  - xG statistics
  - Corners statistics
  - Cards statistics
  - Clean sheets, failed to score
  - Over/Under percentages
  - BTTS percentages
  - Halftime statistics
  - Goal timing statistics (15-minute intervals)
  - Form data
  - Additional info (penalties, possession, etc.)
```

### 3. Can we get all needed data from /league-teams instead?

**YES!** The `/league-teams` endpoint with `include=stats` parameter provides:

1. **All team basic info** (id, name, country, etc.)
2. **All statistics** (same stats object as /team endpoint)
3. **Additional benefit**: Returns ALL teams in one call (no need for individual
   team requests)

Evidence from the code:

- Line 359-364: `fetchLeagueData()` uses `/league-teams` with `include=stats`
- Line 369-373: Successfully finds team and returns same data structure
- Line 825-830: `getAccuratePPG()` uses `/league-teams` with stats
- Line 843-847: Confirms stats object is available

### 4. Most Efficient Algorithm

## Proposed Optimization Strategy

### Algorithm: Smart Team Data Fetching

```javascript
async getOptimizedTeamData(teamId) {
  // Step 1: Check if we already know the team's season_id
  const seasonId = await this.getTeamSeasonId(teamId);

  if (seasonId) {
    // Step 2: Try to get from league-teams cache first
    const cachedLeagueData = this.getFromLeagueTeamsCache(seasonId);
    if (cachedLeagueData) {
      const teamData = cachedLeagueData.find(t => t.id == teamId);
      if (teamData) {
        return teamData; // Found in cache!
      }
    }

    // Step 3: Fetch fresh league-teams data
    const leagueTeams = await this.fetchLeagueTeams(seasonId);
    const teamData = leagueTeams.find(t => t.id == teamId);
    if (teamData) {
      return teamData; // Found!
    }
  }

  // Step 4: ONLY use /team endpoint as last resort
  // (for teams not in our chosen leagues or when season_id unknown)
  return await this.fetchTeamEndpoint(teamId);
}
```

### Benefits of this approach:

1. **Dramatic reduction in API calls**:
   - Instead of 1 call per team, we get ALL teams in 1 call
   - Example: 20 teams = 20 calls → 1 call (95% reduction)

2. **Better caching**:
   - Cache entire league data, not individual teams
   - All teams in a league benefit from single cache entry

3. **Faster response times**:
   - Most requests served from cache
   - No network latency for cached data

4. **Reduced API quota usage**:
   - Fewer calls = less quota consumption
   - More headroom for other features

5. **Fallback safety**:
   - Still supports teams outside chosen leagues
   - Graceful degradation when season_id unknown

### Implementation Steps:

1. **Modify fetchTeamStats()** to check league-teams first
2. **Enhance caching** to store entire league-teams responses
3. **Update cache invalidation** to be league-based, not team-based
4. **Add metrics** to track cache hit rates and API call reduction

### Specific Code Changes Needed:

1. In `fetchTeamStats()` method:
   - Add league-teams check before /team call
   - Only fallback to /team if not found in league

2. In `getTeamData()` method:
   - Reorder logic to prioritize league-teams data
   - Use /team endpoint only as last resort

3. Cache improvements:
   - Expand `leagueTeamsCache` usage
   - Add cache warming on startup for popular leagues

### Estimated Performance Improvement:

- **API Calls**: 80-95% reduction (depending on cache hit rate)
- **Response Time**: 50-70% faster (served from cache)
- **Reliability**: Higher (less dependent on API availability)
- **Cost**: Significant reduction in API usage costs
