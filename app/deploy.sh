#!/bin/bash

# Search Restaurant Agent - Cloud Run Deploy Script
# Usage: ./deploy.sh [PROJECT_ID]

set -e

# Configuration
SERVICE_NAME="search-restaurant-agent"
REGION="asia-northeast1"
REPOSITORY_NAME="search-restaurant-agent"
IMAGE_NAME="app"

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

# Get project ID and optional backend URL
if [ -z "$1" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$PROJECT_ID" ]; then
        log_error "No project ID provided and no default project set. Usage: ./deploy.sh [PROJECT_ID] [BACKEND_URL]"
    fi
    log_info "Using default project: $PROJECT_ID"
else
    PROJECT_ID="$1"
    log_info "Using project: $PROJECT_ID"
fi

# Optional backend URL for service communication
BACKEND_URL="$2"
if [ -n "$BACKEND_URL" ]; then
    log_info "Backend URL provided: $BACKEND_URL"
else
    log_info "No backend URL provided"
fi

# Set project
gcloud config set project "$PROJECT_ID"

# Generate timestamp for tagging
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
COMMIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
IMAGE_TAG="${TIMESTAMP}-${COMMIT_SHA}"

# Full image paths
ARTIFACT_REGISTRY_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY_NAME}/${IMAGE_NAME}"

log_info "Starting deployment..."
log_info "Service: $SERVICE_NAME"
log_info "Region: $REGION"
log_info "Image: $ARTIFACT_REGISTRY_IMAGE:$IMAGE_TAG"

# Check if required APIs are enabled
log_info "Checking required APIs..."
required_apis=(
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
)

for api in "${required_apis[@]}"; do
    if ! gcloud services list --enabled --filter="name:${api}" --format="value(name)" | grep -q "${api}"; then
        log_info "Enabling $api..."
        gcloud services enable "$api"
    else
        log_info "$api is already enabled"
    fi
done

# Create Artifact Registry repository if it doesn't exist
log_info "Checking Artifact Registry repository..."
if ! gcloud artifacts repositories describe "$REPOSITORY_NAME" \
    --location="$REGION" \
    --format="value(name)" &>/dev/null; then
    log_info "Creating Artifact Registry repository..."
    gcloud artifacts repositories create "$REPOSITORY_NAME" \
        --repository-format=docker \
        --location="$REGION" \
        --description="Search Restaurant Agent container images"
    log_success "Repository created"
else
    log_info "Repository already exists"
fi

# Configure Docker authentication
log_info "Configuring Docker authentication..."
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# Build Docker image for 64-bit Linux (Cloud Run compatibility)
log_info "Building Docker image for 64-bit Linux..."
docker build --platform linux/amd64 -t "${ARTIFACT_REGISTRY_IMAGE}:${IMAGE_TAG}" -t "${ARTIFACT_REGISTRY_IMAGE}:latest" .

# Push Docker image
log_info "Pushing Docker image..."
docker push "${ARTIFACT_REGISTRY_IMAGE}:${IMAGE_TAG}"
docker push "${ARTIFACT_REGISTRY_IMAGE}:latest"

# Deploy to Cloud Run
log_info "Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image="${ARTIFACT_REGISTRY_IMAGE}:${IMAGE_TAG}" \
    --region="$REGION" \
    --platform=managed \
    --allow-unauthenticated \
    --port=3000 \
    --memory=1Gi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=100 \
    --timeout=3600 \
    --no-cpu-throttling \
    --execution-environment=gen2 \
    --set-env-vars="NODE_ENV=production,NEXT_TELEMETRY_DISABLED=1,VERTEX_AI_PROJECT_ID=${PROJECT_ID},VERTEX_AI_LOCATION=${REGION}$([ -n "$BACKEND_URL" ] && echo ",NEXT_PUBLIC_API_URL=${BACKEND_URL}")" \
    --cpu-boost

# Get service URL
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format="value(status.url)")

log_success "Deployment completed!"
log_success "Service URL: $SERVICE_URL"
log_info "Image: ${ARTIFACT_REGISTRY_IMAGE}:${IMAGE_TAG}"

# Optional: Open the service in browser (uncomment if desired)
# log_info "Opening service in browser..."
# open "$SERVICE_URL"

log_info "You can view logs with:"
log_info "gcloud logs read --service=$SERVICE_NAME --region=$REGION"