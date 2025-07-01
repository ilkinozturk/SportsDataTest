const express = require('express');
const router = express.Router();
const teamController = require('../controllers/TeamController');

// Team routes
router.get('/data', teamController.getTeamData);
router.post('/compare', teamController.compareTeams);

module.exports = router;