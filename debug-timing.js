// Debug script for timing analytics - MODULAR VERSION
console.log('=== TIMING ANALYTICS DEBUG (MODULAR) ===');

// Wait for scripts to load
setTimeout(function() {
  console.log('\n=== MODULAR SYSTEM CHECK ===');
  console.log('1. EventBus available:', !!window.TeamStatsEventBus);
  console.log('2. GoalsDisplay module:', !!window.TeamStatsGoalsDisplay);
  console.log('3. StateManager:', !!window.TeamStatsStateManager);
  
  // Check buttons
  const timingButtons = document.querySelectorAll('[data-filter-type="timing"]');
  console.log('\n=== TIMING BUTTONS ===');
  console.log('Buttons found:', timingButtons.length);
  timingButtons.forEach(btn => {
    console.log('- Button:', btn.id, '/', btn.getAttribute('data-filter-value'));
  });
  
  // Test EventBus emission
  if (window.TeamStatsEventBus) {
    console.log('\n=== TESTING EVENTBUS ===');
    
    // Listen for timing change
    window.TeamStatsEventBus.on('filters:timing:change', function(filter) {
      console.log('EventBus received timing change:', filter);
    });
    
    // Emit test event
    console.log('Emitting test event: filters:timing:change -> home');
    window.TeamStatsEventBus.emit('filters:timing:change', 'home');
  }
  
  // Test button click
  const homeBtn = document.getElementById('timingHomeFilter');
  if (homeBtn) {
    console.log('\n=== TESTING BUTTON CLICK ===');
    console.log('Clicking home button...');
    homeBtn.click();
  }
  
  // Check if GoalsDisplay has data
  if (window.TeamStatsGoalsDisplay) {
    console.log('\n=== GOALS DISPLAY STATE ===');
    console.log('Has lastStatistics:', !!window.TeamStatsGoalsDisplay.lastStatistics);
    if (window.TeamStatsGoalsDisplay.lastStatistics) {
      const stats = window.TeamStatsGoalsDisplay.lastStatistics;
      console.log('Sample timing data:');
      console.log('- homeGoals0_15:', stats.homeGoals0_15);
      console.log('- awayGoals0_15:', stats.awayGoals0_15);
      console.log('- overallGoals0_15:', stats.goals0_15 || stats.goals0_15_overall);
    }
  }
}, 500);