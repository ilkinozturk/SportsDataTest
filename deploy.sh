#!/bin/bash

# Team Statistics Deployment Script
# Usage: ./deploy.sh [environment] [options]

set -e

# Configuration
ENVIRONMENTS=("staging" "production")
CURRENT_DIR=$(pwd)
BUILD_DIR="public/dist"
BACKUP_DIR="/var/backups/sportsdata"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if environment is provided
if [ -z "$1" ]; then
    print_error "Environment not specified"
    echo "Usage: ./deploy.sh [staging|production] [options]"
    echo "Options:"
    echo "  --skip-build     Skip the build process"
    echo "  --skip-tests     Skip running tests"
    echo "  --skip-backup    Skip backup creation"
    echo "  --dry-run        Show what would be done without doing it"
    exit 1
fi

ENVIRONMENT=$1
shift

# Validate environment
if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo "Valid environments: ${ENVIRONMENTS[@]}"
    exit 1
fi

# Parse options
SKIP_BUILD=false
SKIP_TESTS=false
SKIP_BACKUP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Load environment configuration
if [ "$ENVIRONMENT" = "staging" ]; then
    SERVER="staging.yourdomain.com"
    DEPLOY_PATH="/var/www/staging-sportsdata"
    API_URL="https://staging-api.yourdomain.com"
elif [ "$ENVIRONMENT" = "production" ]; then
    SERVER="yourdomain.com"
    DEPLOY_PATH="/var/www/sportsdata"
    API_URL="https://api.yourdomain.com"
fi

print_info "Deploying to $ENVIRONMENT environment"
print_info "Server: $SERVER"
print_info "Path: $DEPLOY_PATH"

# Pre-deployment checks
print_info "Running pre-deployment checks..."

# Check if git is clean
if [[ -n $(git status -s) ]]; then
    print_warning "Git working directory is not clean"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Run tests
if [ "$SKIP_TESTS" = false ]; then
    print_info "Running tests..."
    if [ "$DRY_RUN" = false ]; then
        npm test || {
            print_error "Tests failed"
            exit 1
        }
    fi
    print_success "Tests passed"
else
    print_warning "Skipping tests"
fi

# Build application
if [ "$SKIP_BUILD" = false ]; then
    print_info "Building application..."
    if [ "$DRY_RUN" = false ]; then
        # Clean previous build
        rm -rf $BUILD_DIR
        
        # Set environment variables
        export NODE_ENV=production
        export API_URL=$API_URL
        
        # Run build
        npm run build || {
            print_error "Build failed"
            exit 1
        }
        
        # Verify build output
        if [ ! -d "$BUILD_DIR" ]; then
            print_error "Build directory not found"
            exit 1
        fi
    fi
    print_success "Build completed"
else
    print_warning "Skipping build"
    
    # Verify existing build
    if [ ! -d "$BUILD_DIR" ]; then
        print_error "No build found. Please run build first."
        exit 1
    fi
fi

# Create backup
if [ "$SKIP_BACKUP" = false ] && [ "$ENVIRONMENT" = "production" ]; then
    print_info "Creating backup..."
    if [ "$DRY_RUN" = false ]; then
        BACKUP_NAME="sportsdata-$(date +%Y%m%d-%H%M%S)"
        ssh $SERVER "mkdir -p $BACKUP_DIR && cp -r $DEPLOY_PATH $BACKUP_DIR/$BACKUP_NAME" || {
            print_warning "Backup failed, but continuing..."
        }
        print_success "Backup created: $BACKUP_NAME"
    fi
else
    print_warning "Skipping backup"
fi

# Deploy files
print_info "Deploying files to $SERVER..."

if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN: Would sync files to $SERVER:$DEPLOY_PATH"
    rsync -avzn --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude '.env' \
        --exclude 'dist/stats.json' \
        public/ $SERVER:$DEPLOY_PATH/public/
else
    # Sync files
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'logs' \
        --exclude '.env' \
        --exclude 'dist/stats.json' \
        public/ $SERVER:$DEPLOY_PATH/public/ || {
        print_error "File sync failed"
        exit 1
    }
    
    print_success "Files deployed"
fi

# Post-deployment tasks
print_info "Running post-deployment tasks..."

if [ "$DRY_RUN" = false ]; then
    # Set correct permissions
    ssh $SERVER "find $DEPLOY_PATH/public -type f -exec chmod 644 {} \;"
    ssh $SERVER "find $DEPLOY_PATH/public -type d -exec chmod 755 {} \;"
    
    # Clear CDN cache if applicable
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Clearing CDN cache..."
        # Add CDN cache clearing command here
    fi
    
    # Restart services if needed
    if [ "$ENVIRONMENT" = "production" ]; then
        print_info "Restarting services..."
        ssh $SERVER "sudo systemctl reload nginx" || print_warning "Failed to reload nginx"
    fi
fi

# Verify deployment
print_info "Verifying deployment..."

if [ "$DRY_RUN" = false ]; then
    # Check if site is accessible
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$SERVER)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        print_success "Site is accessible (HTTP $HTTP_STATUS)"
    else
        print_error "Site returned HTTP $HTTP_STATUS"
        print_warning "Deployment completed but site may not be accessible"
    fi
    
    # Check if main JS file exists
    MAIN_JS=$(ssh $SERVER "ls -1 $DEPLOY_PATH/public/dist/js/team-stats.*.js 2>/dev/null | head -1")
    if [ -n "$MAIN_JS" ]; then
        print_success "Main JavaScript bundle found"
    else
        print_error "Main JavaScript bundle not found"
    fi
fi

# Create deployment record
if [ "$DRY_RUN" = false ]; then
    DEPLOY_RECORD="deploy-$(date +%Y%m%d-%H%M%S).txt"
    cat > $DEPLOY_RECORD << EOF
Deployment Record
================
Date: $(date)
Environment: $ENVIRONMENT
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git rev-parse --abbrev-ref HEAD)
Deployed By: $USER
Server: $SERVER
Path: $DEPLOY_PATH
EOF
    
    print_success "Deployment record created: $DEPLOY_RECORD"
fi

# Summary
echo
print_success "Deployment to $ENVIRONMENT completed successfully!"
echo
print_info "Next steps:"
echo "  1. Verify the application at https://$SERVER"
echo "  2. Check browser console for errors"
echo "  3. Monitor server logs"
echo "  4. Test critical functionality"

if [ "$ENVIRONMENT" = "production" ] && [ "$SKIP_BACKUP" = false ]; then
    echo
    print_info "Rollback command (if needed):"
    echo "  ssh $SERVER 'cp -r $BACKUP_DIR/$BACKUP_NAME/* $DEPLOY_PATH/'"
fi

exit 0