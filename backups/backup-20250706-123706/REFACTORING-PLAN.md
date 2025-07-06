# Refactoring Plan: Modular System Fix

## Current Problems

1. **populate-fix.js** is becoming a monolithic anti-pattern
2. Display modules are not properly updating their own UI
3. Data flow is not clear and consistent
4. Too much coupling between modules

## Proper Solution

### 1. Each Display Module Should Be Self-Contained

```javascript
// Example: goals-display.js
class GoalsDisplay extends BaseDisplay {
  constructor() {
    super();
    this.setupEventListeners();
    this.elementMappings = {
      'scoredPerMatch': ['scoredPerMatch', 'scoredPerMatchAll'],
      'scoredOver05': ['scoredOver05', 'scoredOver05All'],
      // ... define all mappings
    };
  }

  setupEventListeners() {
    // Listen for data updates
    this.eventBus.on('data:team:loaded', this.handleTeamDataLoaded.bind(this));
    this.eventBus.on('filters:change', this.handleFilterChange.bind(this));
    this.stateManager.subscribe('statistics', this.handleStatisticsUpdate.bind(this));
  }

  handleTeamDataLoaded(data) {
    if (data.data && data.data.statistics) {
      this.updateAllElements(data.data.statistics);
    }
  }

  updateAllElements(statistics) {
    const filter = this.stateManager.get('filters.current') || 'overall';
    
    // Update scored per match
    this.updateElementGroup('scoredPerMatch', 
      (statistics.goalsForPerMatch || 0).toFixed(2));
    
    // Update over percentages
    this.updateElementGroup('scoredOver05', 
      `${statistics.seasonScoredOver05Percentage_overall || 0}%`);
    
    // Update penalties
    this.updatePenalties(statistics);
  }

  updateElementGroup(key, value) {
    const ids = this.elementMappings[key] || [key];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
  }
}
```

### 2. Remove populate-fix.js Gradually

Instead of adding more to populate-fix.js, we should:

1. Move each section's update logic to its respective display module
2. Ensure display modules properly initialize and listen to events
3. Remove populate-fix.js once all modules are self-sufficient

### 3. Implement Proper Data Flow

```
API Response 
  → TeamService (transforms data)
  → StateManager (stores data)
  → EventBus (emits data:loaded)
  → Display Modules (update their UI)
```

### 4. Create Base Display Class

```javascript
class BaseDisplay {
  constructor() {
    this.eventBus = window.TeamStatsEventBus;
    this.stateManager = window.TeamStatsStateManager;
    this.initialized = false;
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      return true;
    }
    return false;
  }

  updateElements(mappings) {
    Object.entries(mappings).forEach(([id, value]) => {
      this.updateElement(id, value);
    });
  }
}
```

### 5. Proper Module Registration

```javascript
// module-registry.js
class ModuleRegistry {
  constructor() {
    this.modules = new Map();
    this.initializationOrder = [];
  }

  register(name, module, dependencies = []) {
    this.modules.set(name, {
      instance: module,
      dependencies,
      initialized: false
    });
  }

  async initializeAll() {
    // Initialize in dependency order
    for (const [name, config] of this.modules) {
      if (!config.initialized) {
        await this.initializeModule(name, config);
      }
    }
  }
}
```

## Implementation Steps

1. **Phase 1**: Create BaseDisplay class
2. **Phase 2**: Update GoalsDisplay to be fully self-contained
3. **Phase 3**: Update CardsDisplay to be fully self-contained
4. **Phase 4**: Update CornersDisplay to be fully self-contained
5. **Phase 5**: Update main statistics section
6. **Phase 6**: Remove populate-fix.js

## Benefits

1. **Separation of Concerns** - Each module handles its own UI
2. **Maintainability** - Easy to modify individual sections
3. **Testability** - Each module can be tested independently
4. **Scalability** - Easy to add new display modules
5. **Debugging** - Clear data flow and responsibility

## Code Quality Metrics

- **Coupling**: Low (modules independent)
- **Cohesion**: High (related functionality grouped)
- **Complexity**: Reduced (each module simple)
- **Reusability**: High (base class pattern)
- **Testability**: High (isolated units)