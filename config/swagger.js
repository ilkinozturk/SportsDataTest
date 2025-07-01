const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'SportsData.AI API',
    version: '1.0.0',
    description: 'Football statistics and prediction API powered by FootyStats data',
    contact: {
      name: 'API Support',
      email: 'support@sportsdata.ai',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.sportsdata.ai',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'An error occurred',
              },
              code: {
                type: 'string',
                example: 'ERROR_CODE',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                },
              },
            },
          },
        },
      },
      TeamInfo: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 836,
          },
          name: {
            type: 'string',
            example: 'Real Madrid',
          },
          country: {
            type: 'string',
            example: 'Spain',
          },
          founded: {
            type: 'integer',
            example: 1902,
          },
          logo: {
            type: 'string',
            format: 'uri',
            example: 'https://example.com/logo.png',
          },
        },
      },
      TeamStatistics: {
        type: 'object',
        properties: {
          goalsTotal: {
            type: 'integer',
            example: 56,
          },
          goalsAverage: {
            type: 'number',
            format: 'float',
            example: 2.8,
          },
          goalsFor: {
            type: 'integer',
            example: 56,
          },
          goalsAgainst: {
            type: 'integer',
            example: 20,
          },
          cardsTotal: {
            type: 'integer',
            example: 45,
          },
          cardsAverage: {
            type: 'number',
            format: 'float',
            example: 2.25,
          },
          cardsFor: {
            type: 'integer',
            example: 30,
          },
          cardsAgainst: {
            type: 'integer',
            example: 15,
          },
          cards1H_AVG: {
            type: 'number',
            format: 'float',
            example: 0.95,
          },
          cards2H_AVG: {
            type: 'number',
            format: 'float',
            example: 1.3,
          },
          cornersTotal: {
            type: 'integer',
            example: 150,
          },
          cornersAverage: {
            type: 'number',
            format: 'float',
            example: 7.5,
          },
          recentForm: {
            type: 'string',
            example: 'WWDLW',
          },
          totalWins: {
            type: 'integer',
            example: 15,
          },
          totalDraws: {
            type: 'integer',
            example: 5,
          },
          totalLosses: {
            type: 'integer',
            example: 0,
          },
          btts_percentage: {
            type: 'number',
            format: 'float',
            example: 65.5,
          },
          over15_percentage: {
            type: 'number',
            format: 'float',
            example: 85.2,
          },
          over25_percentage: {
            type: 'number',
            format: 'float',
            example: 75.8,
          },
          cleanSheets: {
            type: 'integer',
            example: 10,
          },
          failedToScore: {
            type: 'integer',
            example: 2,
          },
        },
      },
      Match: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 12345,
          },
          homeTeamId: {
            type: 'integer',
            example: 836,
          },
          awayTeamId: {
            type: 'integer',
            example: 837,
          },
          homeTeamName: {
            type: 'string',
            example: 'Real Madrid',
          },
          awayTeamName: {
            type: 'string',
            example: 'Barcelona',
          },
          homeGoals: {
            type: 'integer',
            example: 2,
          },
          awayGoals: {
            type: 'integer',
            example: 1,
          },
          date: {
            type: 'string',
            format: 'date-time',
            example: '2023-12-25T20:00:00Z',
          },
          status: {
            type: 'string',
            enum: ['scheduled', 'in_play', 'complete', 'cancelled'],
            example: 'complete',
          },
        },
      },
      TeamData: {
        type: 'object',
        properties: {
          teamInfo: {
            $ref: '#/components/schemas/TeamInfo',
          },
          statistics: {
            $ref: '#/components/schemas/TeamStatistics',
          },
          matches: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Match',
            },
          },
          leagueInfo: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                example: 2,
              },
              name: {
                type: 'string',
                example: 'La Liga',
              },
              country: {
                type: 'string',
                example: 'Spain',
              },
              position: {
                type: 'integer',
                example: 1,
              },
            },
          },
        },
      },
      LeagueTeam: {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            example: 836,
          },
          name: {
            type: 'string',
            example: 'Real Madrid',
          },
          position: {
            type: 'integer',
            example: 1,
          },
          points: {
            type: 'integer',
            example: 45,
          },
          played: {
            type: 'integer',
            example: 20,
          },
          wins: {
            type: 'integer',
            example: 15,
          },
          draws: {
            type: 'integer',
            example: 5,
          },
          losses: {
            type: 'integer',
            example: 0,
          },
          goalsFor: {
            type: 'integer',
            example: 56,
          },
          goalsAgainst: {
            type: 'integer',
            example: 20,
          },
          goalDifference: {
            type: 'integer',
            example: 36,
          },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
            example: 'healthy',
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2023-12-25T12:00:00Z',
          },
          uptime: {
            type: 'number',
            example: 3600.5,
          },
          version: {
            type: 'string',
            example: '1.0.0',
          },
          services: {
            type: 'object',
            properties: {
              api: {
                type: 'boolean',
                example: true,
              },
              cache: {
                type: 'boolean',
                example: true,
              },
              database: {
                type: 'boolean',
                example: true,
              },
            },
          },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      Unauthorized: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      NotFound: {
        description: 'Not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
      InternalServerError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Teams',
      description: 'Team data and statistics endpoints',
    },
    {
      name: 'Leagues',
      description: 'League data and standings endpoints',
    },
    {
      name: 'Matches',
      description: 'Match data and results endpoints',
    },
    {
      name: 'Health',
      description: 'System health and monitoring endpoints',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./routes/*.js', './simple-server-optimized.js'], // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;