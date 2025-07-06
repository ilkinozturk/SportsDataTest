# FootyStats API Subscription Investigation Summary

## Key Findings

### 1. API Structure Understanding

- **FootyStats uses SEASON IDs, not league IDs**
- Each league has multiple seasons with different IDs
- The 417 errors occurred because the application was using wrong/outdated
  season IDs

### 2. Subscription Status

- **API Key**: Valid and working
- **Rate Limit**: 1800 requests per hour (hobby plan)
- **Total Leagues**: 1695 leagues available in subscription
- **Major European Leagues**: Available in subscription but NOT activated/chosen
  by user

### 3. Root Cause of 417 Errors

The error message was clear: _"League is not chosen by the user (this might be
delayed by cache if you chose the league recently, wait 1 hour). League may not
exist, or is not available to this user."_

This means:

- The major European leagues (Premier League, La Liga, etc.) are in the
  subscription
- But they are **not activated/selected** in the user's FootyStats panel
- The user needs to log into FootyStats dashboard and select which leagues to
  activate

### 4. Working Leagues Found

From the partial investigation, these leagues ARE working:

#### North American

- **USA MLS** - Season ID: 13973 (30 teams)

#### European

- **Norway Eliteserien** - Season ID: 13987 (16 teams)
- **Finland Veikkausliiga** - Season ID: 14089 (12 teams)
- **Finland Ykkösliiga** - Season ID: 14119 (10 teams)
- **Sweden Allsvenskan** - Season ID: 13963 (16 teams)
- **Sweden Superettan** - Season ID: 13975 (16 teams)

#### South American

- **Brazil Serie A** - Season ID: 14231 (20 teams)
- **Brazil Serie B** - Season ID: 14305 (20 teams)

#### Asian

- **China Chinese Super League** - Season ID: 14153 (16 teams)
- **China China League One** - Season ID: 14400 (16 teams)
- **Japan J1 League** - Season ID: 13960 (20 teams)
- **Japan J2 League** - Season ID: 13961 (20 teams)

### 5. Legacy League IDs Analysis

Tested the hardcoded IDs from the application:

- **1625**: ✅ Still works (this was a valid season ID)
- **1398**: ❌ Not in user's activated leagues
- **1635**: ❌ Not in user's activated leagues
- **1269**: ❌ Not in user's activated leagues
- **1423**: ❌ Not in user's activated leagues

## Immediate Solutions

### Option 1: Activate Major Leagues (Recommended)

1. Log into FootyStats dashboard at https://footystats.org/
2. Use credentials: siriuscash@hotmail.com / 4x5qw3lsk
3. Navigate to "My Leagues" or "League Selection"
4. Activate the major European leagues:
   - Premier League (England)
   - La Liga (Spain)
   - Bundesliga (Germany)
   - Serie A (Italy)
   - Ligue 1 (France)
5. Wait 1 hour for cache to update
6. Use the current season IDs:
   - Premier League: 12325
   - La Liga: 12316
   - Bundesliga: 12529
   - Serie A: 12530
   - Ligue 1: 12337

### Option 2: Use Currently Working Leagues

Update the application to use the confirmed working leagues listed above.

### Option 3: Hybrid Approach

- Use working leagues for immediate functionality
- Activate major leagues for better user experience
- Implement dynamic league selection based on availability

## Code Updates Needed

### Update constants/index.ts

```typescript
// Replace the old MAJOR_LEAGUES with working season IDs
export const WORKING_LEAGUES = {
  // North American
  USA_MLS: 13973,

  // European (Nordic)
  NORWAY_ELITESERIEN: 13987,
  FINLAND_VEIKKAUSLIIGA: 14089,
  SWEDEN_ALLSVENSKAN: 13963,

  // South American
  BRAZIL_SERIE_A: 14231,
  BRAZIL_SERIE_B: 14305,

  // Asian
  CHINA_SUPER_LEAGUE: 14153,
  JAPAN_J1_LEAGUE: 13960,
  JAPAN_J2_LEAGUE: 13961,
} as const;

// If major leagues get activated, use these:
export const MAJOR_EUROPEAN_LEAGUES = {
  PREMIER_LEAGUE: 12325, // England Premier League 2024-25
  LA_LIGA: 12316, // Spain La Liga 2024-25
  BUNDESLIGA: 12529, // Germany Bundesliga 2024-25
  SERIE_A: 12530, // Italy Serie A 2024-25
  LIGUE_1: 12337, // France Ligue 1 2024-25
  CHAMPIONS_LEAGUE: 12321, // UEFA Champions League 2024-25
  EUROPA_LEAGUE: 12327, // UEFA Europa League 2024-25
} as const;
```

### Update FootyStatsApi.ts

Add better error handling for 417 responses:

```typescript
if (error.response?.status === 417) {
  return {
    success: false,
    error:
      'League not activated in subscription. Please activate in FootyStats dashboard.',
  };
}
```

## Next Steps

1. **Immediate**: Update application to use working leagues
2. **Short-term**: Activate major European leagues in FootyStats dashboard
3. **Long-term**: Implement dynamic league availability checking
4. **Enhancement**: Add subscription management features

## Rate Limit Status

- Current: 1650/1800 requests remaining
- Resets: Every hour
- This is sufficient for development and moderate usage

## Login Credentials for FootyStats Dashboard

- **URL**: https://footystats.org/
- **Email**: siriuscash@hotmail.com
- **Password**: 4x5qw3lsk

**Important**: After activating leagues, wait 1 hour for cache to clear before
testing.
