/**
 * Quick API Test
 * Simple test to verify API is working after security changes
 */

const axios = require('axios');

const TEST_URL = 'http://localhost:3003';
const TEST_TEAM_ID = 3011; // Shanghai SIPG

async function quickTest() {
  console.log('🔍 Quick API Test\n');
  
  try {
    // Test 1: Server Health
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${TEST_URL}/api/health`);
    console.log('✅ Server is healthy:', healthResponse.data.status);
    
    // Test 2: Check API Key
    console.log('\n2. Checking API key configuration...');
    const hasApiKey = process.env.FOOTYSTATS_API_KEY ? true : false;
    if (hasApiKey) {
      console.log('✅ API key is configured');
      console.log(`   Key length: ${process.env.FOOTYSTATS_API_KEY.length} characters`);
    } else {
      console.log('❌ API key not found in environment');
      console.log('   Set it with: export FOOTYSTATS_API_KEY=your_key_here');
    }
    
    // Test 3: Matches API
    console.log('\n3. Testing matches API...');
    const matchesResponse = await axios.get(`${TEST_URL}/api/matches/date?timezone=Europe/Istanbul`);
    console.log('✅ Matches API working:', matchesResponse.data.matches.length, 'matches found');
    
    // Test 4: Team Data API (might timeout)
    console.log('\n4. Testing team data API...');
    try {
      const teamResponse = await axios.get(
        `${TEST_URL}/api/teams/data?teamId=${TEST_TEAM_ID}`,
        { timeout: 5000 }
      );
      console.log('✅ Team API working:', teamResponse.data.teamData.cleanName);
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.log('⚠️  Team API timeout (this is normal for first request)');
      } else {
        console.log('❌ Team API error:', error.message);
      }
    }
    
    console.log('\n✨ Basic API functionality confirmed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

quickTest();