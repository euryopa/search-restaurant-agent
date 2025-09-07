#!/bin/bash

# Search Restaurant Agent - Complete Deployment Script
# Usage: ./deploy-all.sh [PROJECT_ID]

set -e

# Configuration
REGION="asia-northeast1"
FRONTEND_SERVICE="search-restaurant-agent"
BACKEND_SERVICE="restaurant-agent"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

log_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Get project ID
if [ -z "$1" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No project ID provided and no default project set. Usage: ./deploy-all.sh [PROJECT_ID]"
    fi
    log_info "Using default project: $PROJECT_ID"
else
    PROJECT_ID="$1"
    log_info "Using project: $PROJECT_ID"
fi

# Set project
gcloud config set project "$PROJECT_ID"

log_info "Starting complete deployment for project: $PROJECT_ID"
log_info "Region: $REGION"

# Check if required APIs are enabled
log_section "Checking Required APIs"
required_apis=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "aiplatform.googleapis.com"
)

for api in "${required_apis[@]}"; do
    if ! gcloud services list --enabled --filter="name:${api}" --format="value(name)" | grep -q "${api}"; then
        log_info "Enabling $api..."
        gcloud services enable "$api"
    else
        log_info "$api is already enabled"
    fi
done

# Deploy Backend First
log_section "Deploying Backend Service ($BACKEND_SERVICE)"
log_info "Running backend deployment..."
if ./deploy-agent.sh "$PROJECT_ID"; then
    # Get backend URL
    BACKEND_URL=$(gcloud run services describe "$BACKEND_SERVICE" \
        --region="$REGION" \
        --format="value(status.url)")
    log_success "Backend deployed successfully: $BACKEND_URL"
else
    log_error "Backend deployment failed"
fi

# Deploy Frontend with Backend URL
log_section "Deploying Frontend Service ($FRONTEND_SERVICE)"
log_info "Running frontend deployment with backend URL..."

# Update frontend deployment to include backend URL
if ./deploy.sh "$PROJECT_ID" "$BACKEND_URL"; then
    # Get frontend URL
    FRONTEND_URL=$(gcloud run services describe "$FRONTEND_SERVICE" \
        --region="$REGION" \
        --format="value(status.url)")
    log_success "Frontend deployed successfully: $FRONTEND_URL"
else
    log_error "Frontend deployment failed"
fi

# Final summary
log_section "Deployment Complete"
log_success "All services deployed successfully!"
echo ""
log_info "Service URLs:"
log_info "Frontend: $FRONTEND_URL"
log_info "Backend:  $BACKEND_URL"
echo ""
log_info "Health checks:"
log_info "Frontend: $FRONTEND_URL"
log_info "Backend:  $BACKEND_URL/health"
echo ""
log_info "API Documentation:"
log_info "Backend:  $BACKEND_URL/docs"
echo ""
log_info "You can view logs with:"
log_info "Frontend: gcloud logs read --service=$FRONTEND_SERVICE --region=$REGION"
log_info "Backend:  gcloud logs read --service=$BACKEND_SERVICE --region=$REGION"

# Test endpoints
log_section "Running Health Checks"
log_info "Testing backend health endpoint..."
if curl -f "$BACKEND_URL/health" --max-time 30 --silent --show-error; then
    log_success "Backend health check passed"
else
    log_warning "Backend health check failed (this is normal for cold start)"
fi

log_info "Testing frontend..."
if curl -f "$FRONTEND_URL" --max-time 30 --silent --show-error >/dev/null; then
    log_success "Frontend health check passed"
else
    log_warning "Frontend health check failed (this is normal for cold start)"
fi

log_success "Deployment script completed!"