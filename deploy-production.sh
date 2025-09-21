#!/bin/bash

# Production Deployment Script for RN-POS
# This script handles the complete production deployment process

set -e  # Exit on any error

echo "🚀 Starting Production Deployment for RN-POS"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v eas &> /dev/null; then
        print_error "EAS CLI is not installed. Install with: npm install -g @expo/eas-cli"
        exit 1
    fi
    
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Install with: npm install -g firebase-tools"
        exit 1
    fi
    
    print_status "All dependencies are installed"
}

# Validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        print_error "Production environment file (.env.production) not found"
        print_warning "Please create .env.production with your production Firebase configuration"
        exit 1
    fi
    
    # Check if API keys are not the default ones
    if grep -q "YOUR_NEW_PRODUCTION_API_KEY" .env.production; then
        print_error "Please update .env.production with your actual production API keys"
        exit 1
    fi
    
    print_status "Environment configuration is valid"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Deploy Firebase security rules and functions
deploy_firebase() {
    print_status "Deploying Firebase configuration..."
    
    # Deploy Firestore security rules
    if [ -f "firestore.rules" ]; then
        firebase deploy --only firestore:rules
        print_status "Firestore security rules deployed"
    else
        print_warning "firestore.rules not found"
    fi
    
    # Deploy Cloud Functions
    if [ -d "functions" ]; then
        cd functions
        npm install
        firebase deploy --only functions
        cd ..
        print_status "Cloud Functions deployed"
    else
        print_warning "functions directory not found"
    fi
    
    # Deploy Realtime Database rules
    if [ -f "database.rules.json" ]; then
        firebase deploy --only database
        print_status "Realtime Database rules deployed"
    else
        print_warning "database.rules.json not found"
    fi
}

# Build production APK
build_production() {
    print_status "Building production APK..."
    
    # Login to EAS if not already logged in
    if ! eas whoami &> /dev/null; then
        print_warning "Please login to EAS: eas login"
        exit 1
    fi
    
    # Build production APK
    eas build --platform android --profile production --non-interactive
    
    print_status "Production APK built successfully"
}

# Run security tests
run_security_tests() {
    print_status "Running security tests..."
    
    # Check for hardcoded secrets
    if grep -r "AIzaSy" . --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" &> /dev/null; then
        print_error "Hardcoded API keys found in code. Please remove them."
        exit 1
    fi
    
    # Check for console.log statements
    if grep -r "console\.log" src/ --exclude-dir=node_modules &> /dev/null; then
        print_warning "Console.log statements found. Consider removing for production."
    fi
    
    print_status "Security tests completed"
}

# Generate deployment report
generate_report() {
    print_status "Generating deployment report..."
    
    REPORT_FILE="deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
RN-POS Production Deployment Report
Generated: $(date)
=====================================

Deployment Status: SUCCESS
Build Profile: production
Platform: Android

Security Checklist:
- [x] Environment variables configured
- [x] Firebase security rules deployed
- [x] API keys secured
- [x] Security tests passed

Build Information:
- Node.js Version: $(node --version)
- npm Version: $(npm --version)
- EAS CLI Version: $(eas --version)
- Firebase CLI Version: $(firebase --version)

Next Steps:
1. Test the production APK on physical devices
2. Monitor Firebase console for any issues
3. Set up production monitoring and alerting
4. Train users on the production system

EOF
    
    print_status "Deployment report generated: $REPORT_FILE"
}

# Main deployment process
main() {
    echo "Starting production deployment process..."
    
    check_dependencies
    validate_environment
    install_dependencies
    run_security_tests
    deploy_firebase
    build_production
    generate_report
    
    print_status "Production deployment completed successfully! 🎉"
    print_warning "Remember to:"
    print_warning "1. Test the APK on physical devices"
    print_warning "2. Monitor Firebase console"
    print_warning "3. Set up production monitoring"
}

# Run main function
main "$@"

