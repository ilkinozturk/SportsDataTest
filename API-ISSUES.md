# FootyStats API Data Issues

## Problem Summary

The FootyStats API is returning outdated or incorrect data for teams,
specifically:

### Shanghai SIPG Case

- **API Returns**: Position 10/16, 0.8 PPG, 10 matches played (2W-2D-6L)
- **Actual Data**: Position 4/16, 2.00 PPG
- **Season**: 2024/2025

## Root Causes

1. **Stale Data**: API returns data from an earlier point in the season
2. **Wrong Competition ID**: API uses competition_id 13356 instead of current
   season 14153
3. **No Live Data Parameter**: No apparent way to force API to return
   current/live data

## Proposed Solutions

### 1. Dynamic Season Detection

```javascript
// Automatically detect and use the latest season ID
const getLatestSeasonId = async leagueName => {
  const allLeagues = await fetchAllLeagues();
  const relevantLeagues = allLeagues.filter(l => l.name.includes(leagueName));
  // Sort by year and return the latest
  return relevantLeagues.sort((a, b) => b.year - a.year)[0].id;
};
```

### 2. Data Validation Layer

```javascript
// Validate data freshness
const validateTeamData = teamData => {
  const lastUpdate = new Date(teamData.last_updated);
  const daysSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60 * 24);

  if (daysSinceUpdate > 7) {
    console.warn(`Data is ${daysSinceUpdate} days old`);
    return { isStale: true, daysSinceUpdate };
  }
  return { isStale: false, daysSinceUpdate };
};
```

### 3. Multiple Data Source Strategy

- Primary: FootyStats API
- Fallback 1: Alternative API endpoint
- Fallback 2: Web scraping from official sources
- Cache with expiration based on match frequency

### 4. Real-time Update Mechanism

```javascript
// Check for newer data periodically
const updateTeamData = async teamId => {
  const currentData = cache.get(teamId);
  const newData = await fetchTeamData(teamId);

  // Compare key metrics
  if (
    newData.matchesPlayed > currentData.matchesPlayed ||
    newData.lastUpdated > currentData.lastUpdated
  ) {
    cache.set(teamId, newData);
    return { updated: true, newData };
  }
  return { updated: false };
};
```

### 5. API Parameter Testing

Need to test these potential parameters:

- `?season=current`
- `?live=true`
- `?date=2025-01-26`
- `?include=latest_stats`

## Immediate Actions

1. Add data freshness indicators to UI
2. Implement warning when data might be outdated
3. Add manual refresh capability
4. Log all API responses for pattern analysis
5. Contact FootyStats support about data currency

## Alternative APIs to Consider

- [ ] Sportmonks API
- [ ] API-Football
- [ ] Football-API.org
- [ ] RapidAPI football endpoints
