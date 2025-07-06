# Team Stats UI Migration Plan

## Overview
Migrate the 3700+ line monolithic team-stats.js to modular architecture using our new modules.

## Phase 1: Analysis & Preparation

### Current Structure Analysis
1. **Global Variables (12)**: Will move to State Manager
   - globalStatistics, currentFilter, currentCardsFilter, etc.
   
2. **Main Functions**: 
   - showTab() - Tab navigation
   - setFilter() - Filter management  
   - updateStatistics() - Data updates
   - populateStatistics() - UI population
   - 50+ update functions for different sections

3. **Event Handlers**:
   - Filter buttons
   - Tab switching
   - Match detail toggles
   
4. **API Calls**:
   - fetchGlobalStatistics()
   - Direct fetch() usage

## Phase 2: Migration Strategy

### 1. State Migration
```javascript
// Old: Global variables
let globalStatistics = null;
let currentFilter = 'overall';

// New: State Manager
TeamStatsStateManager.setState({
  globalStatistics: null,
  filters: {
    current: 'overall',
    cards: 'overall',
    xg: 'overall',
    // ... etc
  },
  activeTab: 'all'
});
```

### 2. Component Creation
Break down into logical components:
- TeamStatsHeader
- TeamStatsFilters  
- TeamStatsTable
- TeamStatsCards
- TeamStatsChart
- MatchList
- GoalTimings

### 3. Event System Migration
```javascript
// Old: Direct DOM manipulation
button.onclick = () => setFilter('home');

// New: Event Bus + UI Events
TeamStatsUIEvents.on(button, 'click', () => {
  TeamStatsEventBus.emit('filter:change', { type: 'current', value: 'home' });
});
```

### 4. API Migration
```javascript
// Old: Direct fetch
fetch('/api/teams/data?teamId=' + teamId)

// New: API Client
TeamStatsAPIClient.getTeamData(teamId)
```

## Phase 3: Implementation Steps

### Step 1: Create Main Application Controller
- `team-stats-app.js` - Main application logic
- Initialize all modules
- Set up event listeners
- Coordinate components

### Step 2: Create UI Components
1. `components/team-stats-header.js`
2. `components/team-stats-filters.js`
3. `components/team-stats-table.js`
4. `components/team-stats-cards.js`
5. `components/match-list.js`

### Step 3: Create Template Files
- `templates/team-stats.html` - Main layout
- `templates/stats-card.html` - Reusable card template
- `templates/match-row.html` - Match list row

### Step 4: Migration Process
1. Copy original as backup
2. Create new modular structure
3. Migrate section by section
4. Test each section
5. Remove old code

## Phase 4: Testing Strategy

### 1. Unit Tests
- Test each component individually
- Mock dependencies
- Verify state updates

### 2. Integration Tests  
- Test component communication
- Verify event flow
- Check API integration

### 3. E2E Tests
- Full page functionality
- Tab switching
- Filter changes
- Data updates

### 4. Performance Tests
- Initial load time
- Filter change responsiveness
- Memory usage

## Benefits After Migration

1. **Maintainability**: 
   - Smaller, focused files
   - Clear separation of concerns
   - Easier debugging

2. **Testability**:
   - Unit test each component
   - Mock dependencies
   - Better coverage

3. **Reusability**:
   - Components can be reused
   - Shared templates
   - Common utilities

4. **Performance**:
   - Lazy loading
   - Efficient updates
   - Better caching

5. **Developer Experience**:
   - Clear module boundaries
   - Better documentation
   - Easier onboarding

## Risk Mitigation

1. **Backward Compatibility**:
   - Keep old file as backup
   - Gradual migration
   - Feature flags

2. **Data Integrity**:
   - Validate all calculations
   - Compare outputs
   - Extensive testing

3. **User Experience**:
   - No visual changes
   - Same functionality
   - Performance improvements only