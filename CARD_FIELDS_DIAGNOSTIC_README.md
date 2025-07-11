# Card Fields Diagnostic Scripts

This directory contains diagnostic scripts to help identify the correct API field names for team card statistics.

## Problem
The team card values are showing as 0, which indicates that the frontend is looking for field names that don't match what the API is returning.

## Scripts

### 1. `find-correct-card-fields.js` (RECOMMENDED - Start Here)
This is the main diagnostic tool that will:
- Connect to your local API server
- Analyze the response for team data
- Search for card-related fields
- Provide specific recommendations for field mappings

**Usage:**
```bash
# Make sure your server is running first
npm run dev

# In another terminal, run:
node find-correct-card-fields.js
```

### 2. `check-card-fields-in-api.js`
A detailed analysis tool that:
- Recursively searches for all card-related fields
- Shows the complete path to each field
- Lists all numeric fields that might be card data

**Usage:**
```bash
node check-card-fields-in-api.js
```

### 3. `quick-card-check.js`
A quick script to check common card field names and show what's available.

**Usage:**
```bash
node quick-card-check.js
```

### 4. `test-card-fields.js` & `analyze-card-api.js`
These scripts are for testing the actual SportsData.AI API directly (requires API key).

## How to Fix the Issue

1. **Run the diagnostic script:**
   ```bash
   node find-correct-card-fields.js
   ```

2. **Look at the output** - it will show:
   - Which fields were found and where
   - Recommended field mappings
   - Fields that are missing

3. **Update the field mappings** in `/public/js/modules/data/cards-data.js`

   For example, if the script finds that cards data is in `additional_info.team_cards_total`:
   ```javascript
   processCardsData(stats, additionalInfo = {}) {
     return {
       cardsFor: additionalInfo.team_cards_total || 0,
       cardsAgainst: additionalInfo.opponent_cards_total || 0,
       // ... other mappings
     };
   }
   ```

4. **Common field name patterns to look for:**
   - `cards_for`, `cardsFor`, `team_cards`, `teamCards`
   - `cards_against`, `cardsAgainst`, `opponent_cards`
   - `yellow_cards`, `yellowCards`, `yellows`
   - `red_cards`, `redCards`, `reds`
   - `total_cards`, `totalCards`, `match_cards`
   - `cards_avg`, `cardsAvg`, `cards_average`

5. **Check different locations in the API response:**
   - `data.statistics.fieldName`
   - `data.statistics.additional_info.fieldName`
   - `data.fieldName`
   - `data.stats.fieldName`

## Troubleshooting

- **Server not running:** Make sure to run `npm run dev` first
- **Wrong port:** Check that your server is on port 3001
- **Wrong team ID:** Update the `teamId` variable in the scripts
- **Fields show as undefined:** The field names don't match - check the "ALL CARD-RELATED FIELDS" section in the output

## Next Steps

After identifying the correct field names:

1. Update `/public/js/modules/data/cards-data.js` with the correct mappings
2. Test the changes in the browser
3. Check if card values now display correctly

If fields are still missing, they might need to be:
- Calculated from match data
- Fetched from a different API endpoint
- Added to the backend API response