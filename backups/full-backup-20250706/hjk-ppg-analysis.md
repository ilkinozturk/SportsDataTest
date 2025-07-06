# HJK (Team 412) PPG Analysis - API Response

## Key Findings

### 1. API Response Structure

The API returned data for HJK (team 412) successfully. The response shows that
this is from a **Cup competition** (season_format: "Cup") with competition_id:
12278 for the 2024/2025 season.

### 2. PPG Values Found

The API returns the following PPG-related fields in the stats object:

- `seasonPPG_overall`: **1.1**
- `seasonPPG_home`: **2**
- `seasonPPG_away`: **0.2**

### 3. Points and Matches Data

- Total matches played: 10
- Wins: 3 (Home: 3, Away: 0)
- Draws: 2 (Home: 1, Away: 1)
- Losses: 5 (Home: 1, Away: 4)
- Total points calculation: (3 × 3) + (2 × 1) + (5 × 0) = 9 + 2 + 0 = **11
  points**

### 4. PPG Calculation Verification

- Expected PPG: 11 points ÷ 10 matches = **1.1 PPG** ✅
- API returns: `seasonPPG_overall`: **1.1** ✅

**The API is returning the correct PPG value!**

### 5. The Issue

The API response shows this data is from a **Cup competition** (competition_id:
12278, season_format: "Cup"), not from the Veikkausliiga league season. This
explains why:

- The table_position is 0 (cups don't have league tables)
- The stats might be different from what we expect for the league

### 6. Competition Details

- Competition ID: 12278 (This is a cup competition, not Veikkausliiga)
- Season: 2024/2025
- Season Format: Cup

## Conclusion

The API is correctly returning PPG values (`seasonPPG_overall`: 1.1), but the
issue is that we're getting data from a Cup competition (ID: 12278) instead of
the Veikkausliiga league data (which should have ID: 14089 based on the server
logs).

The system needs to ensure it's fetching data from the correct
competition/season when multiple competitions are available for a team.
