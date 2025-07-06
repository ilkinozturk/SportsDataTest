# Health Check and Monitoring Endpoints Summary

## Implementation Complete ✅

We have successfully implemented comprehensive health check and monitoring endpoints for the SportsData.Ai application.

## Available Endpoints

### 1. Main Health Check Endpoint
**URL:** `GET /health`
- Provides comprehensive health status of the application
- Returns 200 if healthy, 503 if unhealthy
- Includes:
  - Overall status (UP/DOWN)
  - System uptime and process uptime
  - Memory usage (process and system)
  - CPU usage and load averages
  - Environment information
  - External dependencies status
  - Response time

Example response:
```json
{
    "status": "DOWN",
    "timestamp": "2025-07-01T12:19:40.736Z",
    "uptime": {
        "process": 154.703995457,
        "system": 82854,
        "formatted": "2m 34s"
    },
    "memory": {
        "process": {
            "rss": "112.69 MB",
            "heapTotal": "63.2 MB",
            "heapUsed": "36.53 MB",
            "percentUsed": "57.80%"
        },
        "system": {
            "total": "7.63 GB",
            "free": "6.43 GB",
            "percentUsed": "15.79%"
        }
    },
    "cpu": {
        "cores": 16,
        "loadAverage": { "1m": "0.17", "5m": "0.16", "15m": "0.20" }
    },
    "dependencies": {
        "api": "unhealthy",
        "cache": "healthy"
    }
}
```

### 2. Simple Ping Endpoint
**URL:** `GET /health/ping`
- Returns simple "pong" response
- Useful for load balancers and simple health checks
- Always returns 200 OK

### 3. Liveness Probe
**URL:** `GET /health/live`
- Indicates if the service is alive
- Returns 200 with status "alive"
- Used by container orchestration systems

### 4. Readiness Probe
**URL:** `GET /health/ready`
- Indicates if the service is ready to accept traffic
- Checks external dependencies
- Returns 200 if ready, 503 if not ready

### 5. Application Info
**URL:** `GET /health/info`
- Provides application metadata
- Includes version, environment, uptime, start time
- Always returns 200

Example response:
```json
{
    "name": "sportsdata-ai",
    "version": "1.0.0",
    "description": "Football statistics API",
    "nodeVersion": "v18.19.1",
    "environment": "development",
    "uptime": "2m 34s",
    "startTime": "2025-07-01T12:17:06.033Z"
}
```

### 6. Detailed Metrics
**URL:** `GET /health/metrics`
- Provides detailed application metrics
- Includes cache statistics, memory usage, performance metrics
- Always returns 200

## Additional Health Endpoints (Legacy)

The old health monitoring system is still available at:
- `GET /api/health` - Basic health check
- `GET /api/health/live` - Liveness check
- `GET /api/health/ready` - Readiness check
- `GET /api/health/detailed` - Detailed health information

## Implementation Details

- **Location:** `/src/routes/monitoringRoutes.js`
- **Mounted at:** `/health` (configurable via `MONITORING.HEALTH_CHECK_PATH`)
- **Error Handling:** Uses async handler wrapper for proper error handling
- **Dependencies:** Minimal dependencies, gracefully handles missing components

## Usage Examples

### Check if service is healthy
```bash
curl http://localhost:3001/health
```

### Quick ping test
```bash
curl http://localhost:3001/health/ping
# Response: pong
```

### Get application info
```bash
curl http://localhost:3001/health/info
```

### Get detailed metrics
```bash
curl http://localhost:3001/health/metrics
```

## Notes

- The main health endpoint shows "DOWN" when external API is unreachable, but the service continues to function with cached data
- Redis is optional - the service works with in-memory cache if Redis is unavailable
- All endpoints include proper security headers
- Response times are measured and included in health checks