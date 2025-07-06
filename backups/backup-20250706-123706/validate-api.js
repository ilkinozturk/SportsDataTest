
// Validation script - Compare API responses
const axios = require('axios');
const fs = require('fs');

const snapshot = require('./api-snapshot-2025-06-30T13-40-27-149Z.json');

async function validateResponses() {
  console.log('🔍 Validating API responses against snapshot...');
  
  for (const teamId of Object.keys(snapshot)) {
    const response = await axios.get(`http://localhost:3001/api/teams/data?teamId=${teamId}`);
    const current = response.data;
    const expected = snapshot[teamId];
    
    // Deep comparison
    const differences = compareObjects(current, expected);
    
    if (differences.length > 0) {
      console.error(`❌ Differences found for team ${teamId}:`);
      differences.forEach(diff => console.error(`  - ${diff}`));
    } else {
      console.log(`✅ Team ${teamId} data matches snapshot`);
    }
  }
}

function compareObjects(obj1, obj2, path = '') {
  const differences = [];
  
  // Check all keys in obj1
  for (const key in obj1) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (!(key in obj2)) {
      differences.push(`Missing key: ${fullPath}`);
    } else if (typeof obj1[key] !== typeof obj2[key]) {
      differences.push(`Type mismatch at ${fullPath}: ${typeof obj1[key]} vs ${typeof obj2[key]}`);
    } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      differences.push(...compareObjects(obj1[key], obj2[key], fullPath));
    } else if (obj1[key] !== obj2[key]) {
      differences.push(`Value mismatch at ${fullPath}: ${obj1[key]} vs ${obj2[key]}`);
    }
  }
  
  // Check for extra keys in obj2
  for (const key in obj2) {
    if (!(key in obj1)) {
      const fullPath = path ? `${path}.${key}` : key;
      differences.push(`Extra key: ${fullPath}`);
    }
  }
  
  return differences;
}

validateResponses().catch(console.error);
