# HJK PPG Issue Summary

## The Problem

The system is displaying incorrect PPG (Points Per Game) data for HJK (team ID
412).

## Root Cause Analysis

### 1. Multiple Competition Data

HJK participates in multiple competitions, and the FootyStats API returns data
based on different competition IDs:

1. **Cup Competition (ID: 12278)** - 2024/2025 season
   - Matches: 10
   - W-D-L: 3-2-5
   - Points: 11 (3×3 + 2×1 = 11)
   - PPG: 1.1 ✅ (Correct calculation)

2. **Veikkausliiga (ID: 14089)** - 2025 season
   - Matches: 12
   - W-D-L: 7-2-3
   - Points: 23 (7×3 + 2×1 = 23)
   - PPG: 1.92 ✅ (Correct calculation)

### 2. API Behavior

When calling the `/team` endpoint with just `team_id=412`:

- The API returns data from the Cup competition (ID: 12278)
- This is why the system shows PPG: 1.1 instead of the expected league PPG: 1.92

When calling `/league-teams` or `/league-tables` with the Veikkausliiga season
ID (14089):

- The API correctly returns HJK's league data with PPG: 1.92

### 3. The Issue

The system is not properly filtering team data by the correct competition/season
when fetching team statistics. Even when passing `season_id` parameter to the
`/team` endpoint, it still returns cup data.

## Solution

The system needs to:

1. **Use league-specific endpoints** when fetching team data for a specific
   league
2. **Cross-reference team data** with league tables to ensure the correct
   competition data is being displayed
3. **Prioritize league data** over cup data when displaying team statistics in a
   league context

## Verification

- The FootyStats API is calculating PPG correctly for both competitions
- The issue is with data selection, not calculation
- The system needs to ensure it's fetching data from the correct competition
  context
