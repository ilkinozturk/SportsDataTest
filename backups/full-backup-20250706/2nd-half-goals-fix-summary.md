# 2nd Half Goals Data Fix Summary

## Problem
The Goals tab was showing 0.00 for "2nd Half Scored" data even though the API was returning the data.

## Root Cause
The issue was a field name mismatch between:
- **API Response**: Returns fields as `scored_2hg_avg_overall`, `scored_2hg_avg_home`, `scored_2hg_avg_away`
- **Frontend (goals-display.js)**: Looking for `secondHalfGoalsAVG_overall` or `scoredAVG2H_overall`

## Solution Applied
Added field mappings in `services/teamDataService.js` in the `processStatisticsLegacy` function:

### For 2nd Half Goals Average:
```javascript
// Alternative field names for 2nd Half Goals Average (for compatibility with goals-display.js)
secondHalfGoalsAVG_overall: additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
secondHalfGoalsAVG_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
secondHalfGoalsAVG_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,
scoredAVG2H_overall: additionalInfo.scored_2hg_avg_overall || stats.scored_2hg_avg_overall || 0,
scoredAVG2H_home: additionalInfo.scored_2hg_avg_home || stats.scored_2hg_avg_home || 0,
scoredAVG2H_away: additionalInfo.scored_2hg_avg_away || stats.scored_2hg_avg_away || 0,
```

### For 1st Half Goals Average (bonus fix):
```javascript
// Alternative field names for 1st Half Goals Average (for compatibility with goals-display.js)
firstHalfGoalsAVG_overall: stats.scoredAVGHT_overall || 0,
firstHalfGoalsAVG_home: stats.scoredAVGHT_home || 0,
firstHalfGoalsAVG_away: stats.scoredAVGHT_away || 0,
```

## Files Modified
1. `/services/teamDataService.js` - Added field mappings in processStatisticsLegacy function

## How It Works
The modular system uses the following data flow:
1. API returns data with field names like `scored_2hg_avg_overall`
2. `teamDataService.js` processes the data and adds alternative field names
3. `goals-display.js` module can now find the data using its expected field names (`secondHalfGoalsAVG_overall` or `scoredAVG2H_overall`)
4. The Goals tab now displays the correct 2nd Half Scored values

## Testing
After restarting the server, the 2nd Half Scored data should display correctly in the Goals tab for all teams.

Test file created: `test-2h-goals-fix.html` - Can be used to verify the field mappings are working correctly.