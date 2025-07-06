#!/bin/bash

# Production Migration Script for Team Stats Modular System
# This script safely migrates from legacy to modular architecture

echo "================================================"
echo "Team Stats Production Migration Script"
echo "================================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "team-stats.html" ]; then
    echo "❌ Error: team-stats.html not found in current directory"
    echo "Please run this script from the SportsData.ai directory"
    exit 1
fi

# Create backup directory with timestamp
BACKUP_DIR="backups/migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Creating backup in: $BACKUP_DIR"
echo ""

# Step 1: Backup current files
echo "Step 1: Backing up current files..."
cp team-stats.html "$BACKUP_DIR/team-stats-legacy.html"
cp team-stats.js "$BACKUP_DIR/team-stats-legacy.js"
cp team-stats.css "$BACKUP_DIR/team-stats.css"

# Backup modules directory
if [ -d "public/js/modules" ]; then
    cp -r public/js/modules "$BACKUP_DIR/"
    echo "✅ Modules backed up"
fi

echo "✅ Backup completed"
echo ""

# Step 2: Test production file
echo "Step 2: Testing production file..."
if [ ! -f "team-stats-production.html" ]; then
    echo "❌ Error: team-stats-production.html not found"
    echo "Please ensure the production file exists"
    exit 1
fi

echo "✅ Production file exists"
echo ""

# Step 3: Create migration report
echo "Step 3: Creating migration report..."
cat > "$BACKUP_DIR/migration-report.txt" << EOF
Migration Report
================
Date: $(date)
User: $(whoami)
Directory: $(pwd)

Files Backed Up:
- team-stats.html -> $BACKUP_DIR/team-stats-legacy.html
- team-stats.js -> $BACKUP_DIR/team-stats-legacy.js
- team-stats.css -> $BACKUP_DIR/team-stats.css
- public/js/modules/ -> $BACKUP_DIR/modules/

Migration Steps:
1. Backed up current files
2. Verified production file exists
3. Ready to migrate

To rollback:
cp $BACKUP_DIR/team-stats-legacy.html team-stats.html
cp $BACKUP_DIR/team-stats-legacy.js team-stats.js
EOF

echo "✅ Migration report created"
echo ""

# Step 4: Ask for confirmation
echo "⚠️  WARNING: This will replace the current team-stats.html with the modular version"
echo ""
echo "Current setup:"
echo "- Legacy monolithic system (3700+ lines)"
echo ""
echo "New setup:"
echo "- Modular architecture (40+ modules)"
echo "- Improved performance"
echo "- Better maintainability"
echo ""
read -p "Do you want to proceed with the migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo "❌ Migration cancelled"
    echo "Your files remain unchanged"
    exit 0
fi

# Step 5: Perform migration
echo ""
echo "Step 4: Performing migration..."

# Keep legacy file with different name
cp team-stats.html team-stats-legacy-backup.html
echo "✅ Legacy file saved as team-stats-legacy-backup.html"

# Replace with production version
cp team-stats-production.html team-stats.html
echo "✅ Replaced team-stats.html with modular version"

# Create a marker file
echo "$(date)" > .migration-completed

echo ""
echo "================================================"
echo "✅ MIGRATION COMPLETED SUCCESSFULLY!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Test the application with different team IDs"
echo "2. Monitor for any issues"
echo "3. Check browser console for errors"
echo "4. Run performance tests"
echo ""
echo "To rollback if needed:"
echo "cp $BACKUP_DIR/team-stats-legacy.html team-stats.html"
echo ""
echo "Backup location: $BACKUP_DIR"
echo "================================================"

# Create a simple test URLs file
cat > "$BACKUP_DIR/test-urls.txt" << EOF
Test URLs for verification:
- http://localhost:3005/team-stats.html?teamId=836  (Real Madrid)
- http://localhost:3005/team-stats.html?teamId=15   (Manchester United)
- http://localhost:3005/team-stats.html?teamId=85   (PSG)
- http://localhost:3005/team-stats.html?teamId=3011 (Shanghai SIPG)
EOF

echo ""
echo "Test URLs saved to: $BACKUP_DIR/test-urls.txt"