#!/bin/bash
# Rollback script for emergency situations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_DIR="/var/www/sportsdata-ai"
BACKUP_DIR="/var/backups/sportsdata-ai"

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

# Get latest backup
get_latest_backup() {
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        log_error "No backup found"
        exit 1
    fi
    
    echo "$BACKUP_DIR/$LATEST_BACKUP"
}

# Rollback to specific version
rollback_to_version() {
    local VERSION=$1
    
    log_info "Rolling back to version: $VERSION"
    
    cd "$DEPLOYMENT_DIR"
    
    # Checkout specific version
    git fetch origin
    git checkout "$VERSION"
    
    # Install dependencies
    npm ci --only=production
    
    # Restart services
    docker-compose down
    docker-compose up -d
    
    # Wait for services to be healthy
    sleep 30
    
    # Check health
    if ! curl -f http://localhost/health > /dev/null 2>&1; then
        log_error "Health check failed after rollback"
        exit 1
    fi
    
    log_info "Rollback to version $VERSION completed"
}

# Rollback from backup
rollback_from_backup() {
    local BACKUP_PATH=$1
    
    log_info "Rolling back from backup: $BACKUP_PATH"
    
    # Stop current services
    cd "$DEPLOYMENT_DIR"
    docker-compose down
    
    # Restore code
    if [ -d "$BACKUP_PATH/code" ]; then
        log_info "Restoring code..."
        rm -rf "$DEPLOYMENT_DIR"/*
        cp -r "$BACKUP_PATH/code"/* "$DEPLOYMENT_DIR/"
    fi
    
    # Restore database
    if [ -f "$BACKUP_PATH/database.sql" ]; then
        log_info "Restoring database..."
        docker-compose up -d postgres
        sleep 10
        docker exec -i postgres psql -U sportsdata production < "$BACKUP_PATH/database.sql"
    fi
    
    # Start services
    docker-compose up -d
    
    # Wait for services
    sleep 30
    
    # Check health
    if ! curl -f http://localhost/health > /dev/null 2>&1; then
        log_error "Health check failed after rollback"
        exit 1
    fi
    
    log_info "Rollback from backup completed"
}

# Quick rollback (blue-green switch)
quick_rollback() {
    log_info "Performing quick rollback (blue-green switch)..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Determine current active
    CURRENT_ACTIVE=$(docker ps --format "table {{.Names}}" | grep -E "(blue|green)" | grep -v "exited" | head -1 | grep -o -E "(blue|green)")
    
    if [ "$CURRENT_ACTIVE" == "blue" ]; then
        ROLLBACK_TO="green"
    else
        ROLLBACK_TO="blue"
    fi
    
    log_info "Switching from $CURRENT_ACTIVE to $ROLLBACK_TO"
    
    # Start old environment
    docker-compose -f docker-compose.blue-green.yml up -d $ROLLBACK_TO
    
    # Wait for health
    sleep 20
    
    # Switch traffic
    if [ "$ROLLBACK_TO" == "green" ]; then
        sed -i 's/server blue:3001 weight=100;/server blue:3001 weight=0;/' nginx-blue-green.conf
        sed -i 's/server green:3002 weight=0;/server green:3002 weight=100;/' nginx-blue-green.conf
    else
        sed -i 's/server blue:3001 weight=0;/server blue:3001 weight=100;/' nginx-blue-green.conf
        sed -i 's/server green:3002 weight=100;/server green:3002 weight=0;/' nginx-blue-green.conf
    fi
    
    # Reload Nginx
    docker exec sportsdata-nginx nginx -s reload
    
    # Stop failed environment
    docker-compose -f docker-compose.blue-green.yml stop $CURRENT_ACTIVE
    
    log_info "Quick rollback completed"
}

# Main rollback flow
main() {
    log_warning "=== Starting rollback process ==="
    
    # Check if quick rollback is requested
    if [ "$1" == "--quick" ]; then
        quick_rollback
    elif [ "$1" == "--version" ] && [ ! -z "$2" ]; then
        rollback_to_version "$2"
    elif [ "$1" == "--backup" ] && [ ! -z "$2" ]; then
        rollback_from_backup "$2"
    else
        # Default: rollback from latest backup
        LATEST_BACKUP=$(get_latest_backup)
        rollback_from_backup "$LATEST_BACKUP"
    fi
    
    # Send notification
    ADMIN_EMAIL=${ADMIN_EMAIL:-"admin@sportsdata.ai"}
    echo "Rollback completed at $(date)" | mail -s "Rollback Notification" "$ADMIN_EMAIL" || true
    
    log_info "=== Rollback completed ==="
}

# Usage help
if [ "$1" == "--help" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  --quick              Quick rollback using blue-green switch"
    echo "  --version VERSION    Rollback to specific git version"
    echo "  --backup PATH        Rollback from specific backup"
    echo "  --help              Show this help message"
    exit 0
fi

# Run main function
main "$@"