const axios = require('axios');
require('dotenv').config();

const footyStatsAPI = axios.create({
  baseURL: process.env.FOOTYSTATS_BASE_URL,
  params: {
    key: process.env.FOOTYSTATS_API_KEY, // FootyStats uses 'key' query parameter
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

module.exports = footyStatsAPI;
