const axios = require('axios');
const API_KEY = '29581005f929990bf13dc9c964200d537e484ee248f0ac2d0f76910a6ce7aae9';
const BASE_URL = 'https://api.footystats.org/v1';
async function discoverLeagues() {
  console.log('🔎 Discovering available leagues...');
  try {
    const response = await axios.get(`${BASE_URL}/league-list`, { params: { key: API_KEY } });
    if (response.data.success) {
      console.log('✅ Successfully fetched league list:');
      console.log(JSON.stringify(response.data.data, null, 2));
    } else {
      console.error('❌ Failed to fetch league list.');
    }
  } catch (error) {
    console.error('❌ An error occurred:', error.message);
  }
}
discoverLeagues();
