# Team Endpoint Migration Guide

## Overview

This guide outlines how to migrate from the current `/team` endpoint-heavy
approach to an optimized solution using `/league-teams` as the primary data
source.

## Migration Steps

### Step 1: Integrate OptimizedTeamDataFetcher

```javascript
// In teamDataService.js constructor
this.optimizedFetcher = new OptimizedTeamDataFetcher(apiKey, baseUrl);
```

### Step 2: Replace fetchTeamStats method

Replace the current `fetchTeamStats` method with:

```javascript
async fetchTeamStats(teamId, seasonId = null) {
  // Use the optimized fetcher
  return await this.optimizedFetcher.getTeamStats(teamId, seasonId);
}
```

### Step 3: Implement Cache Warming

Add to your application initialization:

```javascript
// Get all chosen league season IDs
const chosenLeagues = await getChosenLeagueSeasonIdsFinal(apiKey, baseUrl);
const seasonIds = chosenLeagues.map(l => l.season_id).filter(Boolean);

// Warm up cache for frequently accessed leagues
await optimizedFetcher.warmUpCache(seasonIds.slice(0, 10)); // Top 10 leagues
```

### Step 4: Update Other Services

Services that need updating:

1. **CompetitionTypeResolver.js**
   - Replace direct `/team` calls with optimized fetcher
2. **UniversalMappingService.js**
   - Use batch fetch for multiple teams
3. **IntelligentTeamResolver.js**
   - Leverage cached league data for team resolution

### Step 5: Add Performance Monitoring

```javascript
// Add to your logging
setInterval(() => {
  const stats = this.optimizedFetcher.getCacheStats();
  console.log('📊 Cache Stats:', stats);
}, 60000); // Every minute
```

## Testing Strategy

### 1. Unit Tests

```javascript
describe('OptimizedTeamDataFetcher', () => {
  it('should prioritize league-teams endpoint', async () => {
    const teamData = await fetcher.getTeamStats('123', '456');
    expect(teamData._dataSource).toContain('league-teams');
  });

  it('should fallback to team endpoint when needed', async () => {
    const teamData = await fetcher.getTeamStats('999'); // No season ID
    expect(teamData._dataSource).toBe('team-endpoint');
  });
});
```

### 2. Performance Tests

- Measure API call reduction
- Track response time improvements
- Monitor cache hit rates

### 3. Integration Tests

- Verify data consistency between endpoints
- Test edge cases (teams in multiple leagues, cup competitions)

## Rollback Plan

If issues arise, you can quickly rollback by:

1. Commenting out the optimized fetcher initialization
2. Reverting fetchTeamStats to original implementation
3. No data structure changes required - both endpoints return same format

## Expected Results

### Before Optimization:

- 20 team requests = 20 API calls
- Average response time: 500ms per team
- Total time: 10 seconds
- API quota used: 20 calls

### After Optimization:

- 20 team requests = 1-2 API calls (league-teams)
- Average response time: 50ms per team (from cache)
- Total time: 1 second
- API quota used: 1-2 calls

### Benefits:

- **90%+ reduction** in API calls
- **10x faster** response times
- **Better user experience**
- **Lower API costs**

## Monitoring Dashboard

Add these metrics to your monitoring:

```javascript
const metrics = {
  apiCalls: {
    team: 0,
    leagueTeams: 0,
  },
  cacheHits: 0,
  cacheMisses: 0,
  avgResponseTime: 0,
  savedApiCalls: 0,
};
```

## Common Pitfalls to Avoid

1. **Don't forget to handle errors** - League might not be selected by user (417
   error)
2. **Respect rate limits** - Add delays when warming cache
3. **Monitor cache size** - Don't cache too many leagues at once
4. **Handle season transitions** - Clear cache when seasons change

## FAQ

**Q: What if a team is in multiple competitions?** A: The optimized fetcher will
find the team in their primary league. For cup data, the fallback to `/team`
endpoint will still work.

**Q: How often should cache be cleared?** A: Every 15 minutes (current TTL) is
fine for live data. For historical data, you could extend to hours or days.

**Q: What about teams not in chosen leagues?** A: The fallback mechanism ensures
these teams still work via the `/team` endpoint.

## Next Steps

1. Implement the OptimizedTeamDataFetcher
2. Deploy to staging environment
3. Monitor performance metrics for 24 hours
4. Roll out to production with feature flag
5. Gradually increase traffic to optimized path
6. Remove old code after successful migration
