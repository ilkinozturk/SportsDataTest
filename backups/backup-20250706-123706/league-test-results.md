# League Test Results

## Summary of Teams Tested:

| Team ID | Team Name               | League                     | Position | Status                             |
| ------- | ----------------------- | -------------------------- | -------- | ---------------------------------- |
| 7       | Chicago Fire            | USA MLS                    | 1/30     | ✅ Perfect                         |
| 836     | Shanghai SIPG           | China Chinese Super League | 10/16    | ✅ Fixed with mapping              |
| 834     | Guangzhou Evergrande    | China Chinese Super League | 1/16     | ✅ Working (old season)            |
| 842     | Chongqing Dangdai Lifan | China Chinese Super League | 7/16     | ✅ Working (2021 season)           |
| 1153    | Dumbarton               | Scotland League            | 4/0      | ❌ Total teams = 0 (API error 417) |
| 1488    | Shinnik                 | Russia League              | 15/0     | ❌ Total teams = 0 (API error 417) |

## Issues Found:

1. **Scotland League (ID: 12055)** - API returns error 417 when fetching league
   teams
2. **Russia League (ID: 12540)** - API returns error 417 when fetching league
   teams
3. These leagues are not in our supported leagues list (leagues-config.json)

## Supported Leagues Working:

- ✅ USA - MLS
- ✅ China - Chinese Super League (with ID mapping for different seasons)

## Conclusion:

All leagues in our `leagues-config.json` should work correctly. The issues are
with teams from unsupported leagues (Scotland, Russia) which return API
error 417.
