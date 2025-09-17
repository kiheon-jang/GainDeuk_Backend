#!/bin/bash

# GainDeuk Backend Deployment Script
# This script handles the deployment of the GainDeuk backend application

set -e  # Exit on any error

echo "🚀 Starting GainDeuk Backend Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    required_vars=("MONGODB_URI" "REDIS_URL")
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        print_error "Please set these variables before running the deployment script"
        exit 1
    fi
    
    print_success "All required environment variables are set"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if [ -f "package-lock.json" ]; then
        npm ci --production
    else
        npm install --production
    fi
    
    print_success "Dependencies installed successfully"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Run any database setup scripts if they exist
    if [ -f "scripts/migrate.js" ]; then
        node scripts/migrate.js
        print_success "Database migrations completed"
    else
        print_warning "No migration script found, skipping migrations"
    fi
}

# Build the application
build_app() {
    print_status "Building application..."
    
    # Create necessary directories
    mkdir -p logs
    mkdir -p .taskmaster/tasks
    mkdir -p .taskmaster/reports
    mkdir -p .taskmaster/docs
    
    # Set proper permissions
    chmod 755 logs
    chmod 755 .taskmaster
    
    print_success "Application built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    if [ "$SKIP_TESTS" = "true" ]; then
        print_warning "Skipping tests as requested"
        return
    fi
    
    # Run unit tests
    if [ -d "tests" ]; then
        npm test
        print_success "Tests passed successfully"
    else
        print_warning "No tests found, skipping test execution"
    fi
}

# Start the application
start_app() {
    print_status "Starting application..."
    
    if [ "$USE_PM2" = "true" ]; then
        print_status "Starting with PM2..."
        pm2 start ecosystem.config.js --env production
        pm2 save
        print_success "Application started with PM2"
    else
        print_status "Starting with Node.js..."
        node src/server.js &
        APP_PID=$!
        echo $APP_PID > app.pid
        print_success "Application started with PID: $APP_PID"
    fi
}

# Health check
health_check() {
    print_status "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000/health > /dev/null 2>&1; then
            print_success "Health check passed"
            return 0
        fi
        
        print_status "Health check attempt $attempt/$max_attempts failed, retrying in 5 seconds..."
        sleep 5
        ((attempt++))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Remove PID file if it exists
    if [ -f "app.pid" ]; then
        rm -f app.pid
    fi
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    print_status "Starting GainDeuk Backend deployment process..."
    
    # Set trap for cleanup on exit
    trap cleanup EXIT
    
    # Check environment variables
    check_env_vars
    
    # Install dependencies
    install_dependencies
    
    # Run migrations
    run_migrations
    
    # Build application
    build_app
    
    # Run tests
    run_tests
    
    # Start application
    start_app
    
    # Wait a moment for the app to start
    sleep 5
    
    # Perform health check
    if health_check; then
        print_success "🎉 GainDeuk Backend deployed successfully!"
        print_status "Application is running on port 3000"
        print_status "Health check endpoint: http://localhost:3000/health"
        print_status "API documentation: http://localhost:3000/api-docs"
    else
        print_error "❌ Deployment failed - health check did not pass"
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "start")
        start_app
        ;;
    "stop")
        print_status "Stopping application..."
        if [ "$USE_PM2" = "true" ]; then
            pm2 stop gaindeuk-backend
        else
            if [ -f "app.pid" ]; then
                kill $(cat app.pid) 2>/dev/null || true
                rm -f app.pid
            fi
        fi
        print_success "Application stopped"
        ;;
    "restart")
        print_status "Restarting application..."
        if [ "$USE_PM2" = "true" ]; then
            pm2 restart gaindeuk-backend
        else
            $0 stop
            sleep 2
            $0 start
        fi
        print_success "Application restarted"
        ;;
    "status")
        print_status "Checking application status..."
        if [ "$USE_PM2" = "true" ]; then
            pm2 status gaindeuk-backend
        else
            if [ -f "app.pid" ] && kill -0 $(cat app.pid) 2>/dev/null; then
                print_success "Application is running (PID: $(cat app.pid))"
            else
                print_error "Application is not running"
            fi
        fi
        ;;
    "logs")
        print_status "Showing application logs..."
        if [ "$USE_PM2" = "true" ]; then
            pm2 logs gaindeuk-backend
        else
            tail -f logs/combined.log
        fi
        ;;
    *)
        main
        ;;
esac
