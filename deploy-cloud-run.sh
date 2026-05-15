#!/bin/bash
# =============================================================================
# Google Cloud Run Deployment Script for iAssetsPro EAM System
# =============================================================================
# Prerequisites:
#   1. Google Cloud CLI installed (https://cloud.google.com/sdk/docs/install)
#   2. Authenticated: gcloud auth login
#   3. A Google Cloud project created
#   4. Billing enabled for the project
#
# Usage:
#   chmod +x deploy-cloud-run.sh
#   ./deploy-cloud-run.sh [PROJECT_ID] [REGION]
#
# Examples:
#   ./deploy-cloud-run.sh my-project-123
#   ./deploy-cloud-run.sh my-project-123 us-central1
# =============================================================================

set -e

# ---- Configuration ----
PROJECT_ID="${1:-}"
REGION="${2:-us-central1}"
SERVICE_NAME="eam-system"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
MIN_INSTANCES=0
MAX_INSTANCES=10
MEMORY="512Mi"
CPU="1"
CONCURRENCY=80

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo ""
    echo "============================================"
    echo "  iAssetsPro EAM - Cloud Run Deploy"
    echo "============================================"
}

print_step() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# ---- Pre-flight checks ----
print_header

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
    print_error "Google Cloud CLI (gcloud) is not installed."
    echo "  Install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi
print_step "gcloud CLI found"

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed."
    echo "  Install it from: https://docs.docker.com/get-docker/"
    exit 1
fi
print_step "Docker found"

# Get or set project
if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
    if [ -z "$PROJECT_ID" ]; then
        print_error "No Google Cloud project specified."
        echo "  Usage: $0 <PROJECT_ID> [REGION]"
        echo "  Create a project at: https://console.cloud.google.com/projectcreate"
        exit 1
    fi
fi
print_step "Using project: ${PROJECT_ID}"

# Set the project
gcloud config set project "$PROJECT_ID" > /dev/null 2>&1
print_step "Project set"

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
    print_warn "Not authenticated. Running 'gcloud auth login'..."
    gcloud auth login
fi
print_step "Authenticated"

# ---- Enable required APIs ----
echo ""
echo "Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com \
    --project="$PROJECT_ID" 2>/dev/null || true
print_step "Required APIs enabled"

# ---- Build the Docker image ----
echo ""
echo "Building Docker image..."
echo "  This may take 5-10 minutes on first build..."
echo ""

docker build -t "$IMAGE_NAME" .

if [ $? -ne 0 ]; then
    print_error "Docker build failed!"
    exit 1
fi
print_step "Docker image built: ${IMAGE_NAME}"

# ---- Push to Google Container Registry ----
echo ""
echo "Pushing image to Google Container Registry..."
gcloud auth configure-docker --quiet 2>/dev/null || true
docker push "$IMAGE_NAME"

if [ $? -ne 0 ]; then
    print_error "Failed to push image!"
    exit 1
fi
print_step "Image pushed to GCR"

# ---- Configure environment variables ----
echo ""
echo "Now configuring Cloud Run service..."
echo ""

read -p "  Database Host (default: lightworldtech.com): " DB_HOST
DB_HOST="${DB_HOST:-lightworldtech.com}"

read -p "  Database Port (default: 3306): " DB_PORT
DB_PORT="${DB_PORT:-3306}"

read -p "  Database User (default: lightwor_nestjsApps): " DB_USER
DB_USER="${DB_USER:-lightwor_nestjsApps}"

read -sp "  Database Password: " DB_PASS
echo ""
DB_PASS="${DB_PASS:-@@Myjesus4me2016\$\$}"

read -p "  Database Name (default: lightwor_iassetspro_db): " DB_NAME
DB_NAME="${DB_NAME:-lightwor_iassetspro_db}"

DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo ""
echo "  Session Secret (auto-generated or enter your own): "
read -p "  (press Enter to auto-generate): " SESSION_SECRET
SESSION_SECRET="${SESSION_SECRET:-$(openssl rand -hex 32 2>/dev/null || echo 'cloud-run-session-secret-change-me')}"

# ---- Deploy to Cloud Run ----
echo ""
echo "Deploying to Cloud Run..."
echo "  Region: ${REGION}"
echo "  Service: ${SERVICE_NAME}"
echo "  Memory: ${MEMORY}, CPU: ${CPU}"
echo "  Min instances: ${MIN_INSTANCES}, Max: ${MAX_INSTANCES}"
echo ""

gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --allow-unauthenticated \
    --memory="$MEMORY" \
    --cpu="$CPU" \
    --min-instances="$MIN_INSTANCES" \
    --max-instances="$MAX_INSTANCES" \
    --concurrency="$CONCURRENCY" \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="DB_HOST=${DB_HOST}" \
    --set-env-vars="DB_PORT=${DB_PORT}" \
    --set-env-vars="DB_USER=${DB_USER}" \
    --set-env-vars="DB_PASSWORD=${DB_PASS}" \
    --set-env-vars="DB_NAME=${DB_NAME}" \
    --set-env-vars="DATABASE_URL=${DATABASE_URL}" \
    --set-cloudsql-instances="" \
    --no-cpu-throttling

if [ $? -ne 0 ]; then
    print_error "Deployment failed!"
    echo "  Check Cloud Run logs: gcloud run services logs ${SERVICE_NAME} --region=${REGION}"
    exit 1
fi

# ---- Get the service URL ----
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --format="value(status.url)")

# ---- Done! ----
echo ""
echo "============================================"
echo -e "${GREEN}  Deployment Successful!${NC}"
echo "============================================"
echo ""
echo "  Service URL: ${SERVICE_URL}"
echo "  Service Name: ${SERVICE_NAME}"
echo "  Region: ${REGION}"
echo ""
echo "  Useful commands:"
echo "    View logs:   gcloud run services logs ${SERVICE_NAME} --region=${REGION}"
echo "    View config: gcloud run services describe ${SERVICE_NAME} --region=${REGION}"
echo "    Update env:  gcloud run services update ${SERVICE_NAME} --region=${REGION} --set-env-vars KEY=VALUE"
echo "    Shell into:  gcloud run jobs create debug --image=${IMAGE_NAME} --command='sleep', '3600'"
echo ""
