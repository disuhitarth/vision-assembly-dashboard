#!/bin/bash

# Vision Assembly Dashboard - Demo Startup Script

echo "🏭 Starting Vision Assembly Dashboard - Demo Mode"
echo "=================================================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start the API server
echo "🚀 Starting API server on port 4000..."
node simple-api.js &
API_PID=$!
sleep 3

# Test API health
echo "🔍 Testing API connection..."
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo "✅ API server is running successfully"
else
    echo "❌ API server failed to start"
    exit 1
fi

# Start the demo dashboard server
echo "📱 Starting demo dashboard server on port 3000..."
node serve-demo.js &
WEB_PID=$!
sleep 2

# Test web server
echo "🌐 Testing web server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Web server is running successfully"
else
    echo "❌ Web server failed to start"
    exit 1
fi

echo ""
echo "🎉 Vision Assembly Dashboard is now running!"
echo "=================================================="
echo "📊 API Server:      http://localhost:4000"
echo "📚 API Health:      http://localhost:4000/api/health"
echo "📱 Dashboard:       http://localhost:3000"
echo ""
echo "🔧 Demo Features:"
echo "  • Real-time PLC simulation"
echo "  • Automated defect detection"
echo "  • Random alarm generation"
echo "  • Emergency stop functionality"
echo "  • Live production metrics"
echo ""
echo "⚠️  Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $API_PID $WEB_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Keep the script running
while true; do
    sleep 1
done