// Backup script - Current API response snapshot
const axios = require('axios');
const fs = require('fs');

async function backupCurrentResponse() {
  try {
    console.log('📸 Taking snapshot of current API responses...');
    
    // Test team IDs
    const testTeamIds = ['836', '849', '1020'];
    const snapshots = {};
    
    for (const teamId of testTeamIds) {
      console.log(`Fetching data for team ${teamId}...`);
      const response = await axios.get(`http://localhost:3001/api/teams/data?teamId=${teamId}`);
      snapshots[teamId] = response.data;
    }
    
    // Save snapshots
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `api-snapshot-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(snapshots, null, 2));
    console.log(`✅ Snapshot saved to ${filename}`);
    
    // Create validation script
    const validationScript = `
// Validation script - Compare API responses
const axios = require('axios');
const fs = require('fs');

const snapshot = require('./${filename}');

async function validateResponses() {
  console.log('🔍 Validating API responses against snapshot...');
  
  for (const teamId of Object.keys(snapshot)) {
    const response = await axios.get(\`http://localhost:3001/api/teams/data?teamId=\${teamId}\`);
    const current = response.data;
    const expected = snapshot[teamId];
    
    // Deep comparison
    const differences = compareObjects(current, expected);
    
    if (differences.length > 0) {
      console.error(\`❌ Differences found for team \${teamId}:\`);
      differences.forEach(diff => console.error(\`  - \${diff}\`));
    } else {
      console.log(\`✅ Team \${teamId} data matches snapshot\`);
    }
  }
}

function compareObjects(obj1, obj2, path = '') {
  const differences = [];
  
  // Check all keys in obj1
  for (const key in obj1) {
    const fullPath = path ? \`\${path}.\${key}\` : key;
    
    if (!(key in obj2)) {
      differences.push(\`Missing key: \${fullPath}\`);
    } else if (typeof obj1[key] !== typeof obj2[key]) {
      differences.push(\`Type mismatch at \${fullPath}: \${typeof obj1[key]} vs \${typeof obj2[key]}\`);
    } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
      differences.push(...compareObjects(obj1[key], obj2[key], fullPath));
    } else if (obj1[key] !== obj2[key]) {
      differences.push(\`Value mismatch at \${fullPath}: \${obj1[key]} vs \${obj2[key]}\`);
    }
  }
  
  // Check for extra keys in obj2
  for (const key in obj2) {
    if (!(key in obj1)) {
      const fullPath = path ? \`\${path}.\${key}\` : key;
      differences.push(\`Extra key: \${fullPath}\`);
    }
  }
  
  return differences;
}

validateResponses().catch(console.error);
`;
    
    fs.writeFileSync('validate-api.js', validationScript);
    console.log('✅ Validation script created: validate-api.js');
    
  } catch (error) {
    console.error('Error creating backup:', error.message);
  }
}

backupCurrentResponse();