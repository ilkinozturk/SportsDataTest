#!/bin/bash
# Zero-downtime deployment script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="/var/www/sportsdata-ai"
BACKUP_DIR="/var/backups/sportsdata-ai"
MAX_HEALTH_CHECKS=10
HEALTH_CHECK_INTERVAL=5

# Functions
log_info() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."
    
    # Check disk space
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 90 ]; then
        log_error "Disk usage is above 90%. Aborting deployment."
        exit 1
    fi
    
    # Check if services are running
    if ! docker ps | grep -q sportsdata-api; then
        log_warning "API service is not running"
    fi
    
    # Check Redis connection
    if ! docker exec sportsdata-redis redis-cli ping > /dev/null 2>&1; then
        log_error "Redis is not responding. Aborting deployment."
        exit 1
    fi
    
    log_info "Pre-deployment checks passed"
}

# Backup current deployment
backup_current() {
    log_info "Creating backup of current deployment..."
    
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"
    
    mkdir -p "$BACKUP_PATH"
    
    # Backup database
    if docker ps | grep -q postgres; then
        docker exec postgres pg_dump -U sportsdata production > "$BACKUP_PATH/database.sql"
    fi
    
    # Backup current code
    cp -r "$DEPLOYMENT_DIR" "$BACKUP_PATH/code"
    
    # Save current Docker images
    docker images | grep sportsdata | awk '{print $1":"$2}' > "$BACKUP_PATH/docker_images.txt"
    
    log_info "Backup created at: $BACKUP_PATH"
}

# Deploy new version
deploy() {
    log_info "Starting deployment..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Pull latest code
    log_info "Pulling latest code..."
    git fetch origin
    git reset --hard origin/main
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --only=production
    
    # Run database migrations if any
    if [ -f "migrations/run.js" ]; then
        log_info "Running database migrations..."
        node migrations/run.js
    fi
    
    # Build assets if needed
    if [ -f "package.json" ] && grep -q "build" package.json; then
        log_info "Building assets..."
        npm run build
    fi
    
    # Update Docker images
    log_info "Updating Docker images..."
    docker-compose pull
    
    # Deploy using blue-green strategy
    blue_green_deploy
}

# Blue-green deployment
blue_green_deploy() {
    log_info "Starting blue-green deployment..."
    
    # Determine current active environment
    CURRENT_ACTIVE=$(docker ps --format "table {{.Names}}" | grep -E "(blue|green)" | grep -v "exited" | head -1 | grep -o -E "(blue|green)")
    
    if [ "$CURRENT_ACTIVE" == "blue" ]; then
        NEW_ACTIVE="green"
    else
        NEW_ACTIVE="blue"
    fi
    
    log_info "Current active: $CURRENT_ACTIVE, deploying to: $NEW_ACTIVE"
    
    # Start new environment
    docker-compose -f docker-compose.blue-green.yml up -d $NEW_ACTIVE
    
    # Wait for new environment to be healthy
    log_info "Waiting for $NEW_ACTIVE to be healthy..."
    HEALTH_CHECKS=0
    while [ $HEALTH_CHECKS -lt $MAX_HEALTH_CHECKS ]; do
        if docker exec sportsdata-api-$NEW_ACTIVE node healthcheck.js > /dev/null 2>&1; then
            log_info "$NEW_ACTIVE is healthy"
            break
        fi
        
        HEALTH_CHECKS=$((HEALTH_CHECKS + 1))
        log_info "Health check attempt $HEALTH_CHECKS/$MAX_HEALTH_CHECKS"
        sleep $HEALTH_CHECK_INTERVAL
    done
    
    if [ $HEALTH_CHECKS -eq $MAX_HEALTH_CHECKS ]; then
        log_error "$NEW_ACTIVE failed health checks. Rolling back..."
        docker-compose -f docker-compose.blue-green.yml stop $NEW_ACTIVE
        exit 1
    fi
    
    # Switch traffic to new environment
    log_info "Switching traffic to $NEW_ACTIVE..."
    switch_traffic $NEW_ACTIVE
    
    # Wait for traffic to stabilize
    sleep 10
    
    # Stop old environment
    log_info "Stopping $CURRENT_ACTIVE..."
    docker-compose -f docker-compose.blue-green.yml stop $CURRENT_ACTIVE
    
    log_info "Blue-green deployment completed successfully"
}

# Switch traffic
switch_traffic() {
    local TARGET=$1
    
    # Update Nginx configuration
    if [ "$TARGET" == "green" ]; then
        sed -i 's/server blue:3001 weight=100;/server blue:3001 weight=0;/' "$DEPLOYMENT_DIR/nginx-blue-green.conf"
        sed -i 's/server green:3002 weight=0;/server green:3002 weight=100;/' "$DEPLOYMENT_DIR/nginx-blue-green.conf"
    else
        sed -i 's/server blue:3001 weight=0;/server blue:3001 weight=100;/' "$DEPLOYMENT_DIR/nginx-blue-green.conf"
        sed -i 's/server green:3002 weight=100;/server green:3002 weight=0;/' "$DEPLOYMENT_DIR/nginx-blue-green.conf"
    fi
    
    # Reload Nginx
    docker exec sportsdata-nginx nginx -s reload
}

# Post-deployment tasks
post_deployment() {
    log_info "Running post-deployment tasks..."
    
    # Clear cache
    log_info "Clearing cache..."
    docker exec sportsdata-redis redis-cli FLUSHDB
    
    # Warm up cache
    log_info "Warming up cache..."
    curl -s http://localhost/api/team/836 > /dev/null
    curl -s http://localhost/api/team/840 > /dev/null
    
    # Clean up old Docker images
    log_info "Cleaning up old Docker images..."
    docker image prune -f
    
    # Clean up old backups (keep last 5)
    log_info "Cleaning up old backups..."
    cd "$BACKUP_DIR"
    ls -t | tail -n +6 | xargs -r rm -rf
    
    log_info "Post-deployment tasks completed"
}

# Send notification
send_notification() {
    local STATUS=$1
    local MESSAGE=$2
    
    # Slack notification
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-type: application/json' \
            --data "{\"text\":\"Deployment $STATUS: $MESSAGE\"}"
    fi
    
    # Email notification
    if [ ! -z "$ADMIN_EMAIL" ]; then
        echo "$MESSAGE" | mail -s "Deployment $STATUS" "$ADMIN_EMAIL"
    fi
}

# Main deployment flow
main() {
    log_info "=== Starting deployment process ==="
    
    # Run pre-deployment checks
    pre_deployment_checks
    
    # Create backup
    backup_current
    
    # Deploy new version
    if deploy; then
        # Run post-deployment tasks
        post_deployment
        
        log_info "=== Deployment completed successfully ==="
        send_notification "SUCCESS" "Deployment completed successfully at $(date)"
        exit 0
    else
        log_error "=== Deployment failed ==="
        send_notification "FAILED" "Deployment failed at $(date)"
        exit 1
    fi
}

# Run main function
main "$@"