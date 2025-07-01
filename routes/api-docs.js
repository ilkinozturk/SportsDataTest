/**
 * @swagger
 * /api/team/{teamId}:
 *   get:
 *     summary: Get team data and statistics
 *     description: Retrieve comprehensive team information including statistics, recent matches, and league position
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique team identifier
 *         example: 836
 *     responses:
 *       200:
 *         description: Team data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/TeamData'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/league-teams/{leagueId}:
 *   get:
 *     summary: Get league teams and standings
 *     description: Retrieve all teams in a league with their current standings and statistics
 *     tags: [Leagues]
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique league identifier
 *         example: 2
 *       - in: query
 *         name: seasonId
 *         schema:
 *           type: integer
 *         description: Season identifier (defaults to current season)
 *         example: 2023
 *     responses:
 *       200:
 *         description: League teams retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     league:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         name:
 *                           type: string
 *                           example: 'La Liga'
 *                         country:
 *                           type: string
 *                           example: 'Spain'
 *                         seasonId:
 *                           type: integer
 *                           example: 2023
 *                     teams:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeagueTeam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/today:
 *   get:
 *     summary: Get today's matches
 *     description: Retrieve all matches scheduled for today
 *     tags: [Matches]
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: '2023-12-25'
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/date/{date}:
 *   get:
 *     summary: Get matches by date
 *     description: Retrieve all matches scheduled for a specific date
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date in YYYY-MM-DD format
 *         example: '2023-12-25'
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         description: Timezone for match times
 *         example: 'Europe/Madrid'
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                       example: '2023-12-25'
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/range:
 *   get:
 *     summary: Get matches in date range
 *     description: Retrieve all matches scheduled between two dates
 *     tags: [Matches]
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date in YYYY-MM-DD format
 *         example: '2023-12-20'
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date in YYYY-MM-DD format
 *         example: '2023-12-31'
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                       format: date
 *                       example: '2023-12-20'
 *                     to:
 *                       type: string
 *                       format: date
 *                       example: '2023-12-31'
 *                     totalMatches:
 *                       type: integer
 *                       example: 125
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/team/{teamId}:
 *   get:
 *     summary: Get team matches
 *     description: Retrieve all matches for a specific team
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique team identifier
 *         example: 836
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, scheduled, complete, in_play]
 *         description: Filter by match status
 *         example: complete
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of matches to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     teamId:
 *                       type: integer
 *                       example: 836
 *                     teamName:
 *                       type: string
 *                       example: 'Real Madrid'
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/h2h/{team1}/{team2}:
 *   get:
 *     summary: Get head-to-head matches
 *     description: Retrieve historical matches between two teams
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: team1
 *         required: true
 *         schema:
 *           type: integer
 *         description: First team ID
 *         example: 836
 *       - in: path
 *         name: team2
 *         required: true
 *         schema:
 *           type: integer
 *         description: Second team ID
 *         example: 837
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Maximum number of matches to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Head-to-head matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     team1:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 836
 *                         name:
 *                           type: string
 *                           example: 'Real Madrid'
 *                         wins:
 *                           type: integer
 *                           example: 12
 *                     team2:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 837
 *                         name:
 *                           type: string
 *                           example: 'Barcelona'
 *                         wins:
 *                           type: integer
 *                           example: 10
 *                     draws:
 *                       type: integer
 *                       example: 5
 *                     totalMatches:
 *                       type: integer
 *                       example: 27
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/standings/{leagueId}:
 *   get:
 *     summary: Get league standings
 *     description: Retrieve current league table and standings
 *     tags: [Leagues]
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique league identifier
 *         example: 2
 *       - in: query
 *         name: seasonId
 *         schema:
 *           type: integer
 *         description: Season identifier (defaults to current season)
 *         example: 2023
 *     responses:
 *       200:
 *         description: Standings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     league:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 2
 *                         name:
 *                           type: string
 *                           example: 'La Liga'
 *                         seasonId:
 *                           type: integer
 *                           example: 2023
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       example: '2023-12-25T12:00:00Z'
 *                     standings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/LeagueTeam'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/live:
 *   get:
 *     summary: Get live matches
 *     description: Retrieve all matches currently in play
 *     tags: [Matches]
 *     responses:
 *       200:
 *         description: Live matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                       example: '2023-12-25T15:30:00Z'
 *                     totalMatches:
 *                       type: integer
 *                       example: 8
 *                     matches:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Match'
 *                           - type: object
 *                             properties:
 *                               minute:
 *                                 type: integer
 *                                 example: 45
 *                               period:
 *                                 type: string
 *                                 enum: ['1H', 'HT', '2H', 'ET', 'PEN']
 *                                 example: '2H'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /api/matches/league/{leagueId}:
 *   get:
 *     summary: Get league matches
 *     description: Retrieve all matches for a specific league
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Unique league identifier
 *         example: 2
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, scheduled, complete, in_play]
 *         description: Filter by match status
 *         example: complete
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of matches per page
 *         example: 20
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     leagueId:
 *                       type: integer
 *                       example: 2
 *                     leagueName:
 *                       type: string
 *                       example: 'La Liga'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalPages:
 *                           type: integer
 *                           example: 10
 *                         totalMatches:
 *                           type: integer
 *                           example: 200
 *                     matches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Match'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check the health status of the API and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

module.exports = {}; // Empty export to make this a module