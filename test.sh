#!/bin/bash

# Test runner script for CV Screening Tool
echo "🧪 CV Screening Tool - Test Suite"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_status $RED "❌ Node.js is not installed. Please install Node.js to run tests."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_status $RED "❌ npm is not installed. Please install npm to run tests."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status $YELLOW "📦 Installing dependencies..."
    npm install
fi

# Set test environment
export NODE_ENV=test

print_status $YELLOW "🔧 Setting up test environment..."

# Run different types of tests based on argument
case "$1" in
    "unit")
        print_status $YELLOW "🏃 Running unit tests..."
        npm run test:unit
        ;;
    "integration")
        print_status $YELLOW "🏃 Running integration tests..."
        npm run test:integration
        ;;
    "coverage")
        print_status $YELLOW "📊 Running tests with coverage..."
        npm run test:coverage
        ;;
    "watch")
        print_status $YELLOW "👀 Running tests in watch mode..."
        npm run test:watch
        ;;
    "ci")
        print_status $YELLOW "🚀 Running CI test suite..."
        npm run test:unit && npm run test:integration
        ;;
    *)
        print_status $YELLOW "🏃 Running all tests..."
        npm test
        ;;
esac

# Check exit code
if [ $? -eq 0 ]; then
    print_status $GREEN "✅ All tests passed!"
    
    # If coverage was run, show where to find the report
    if [ "$1" = "coverage" ] && [ -d "coverage" ]; then
        print_status $GREEN "📊 Coverage report generated at: coverage/index.html"
    fi
else
    print_status $RED "❌ Some tests failed. Please check the output above."
    exit 1
fi