#!/bin/bash

# Vision Assembly Dashboard - Webcam Demo Startup Script

echo "📹 Starting Vision Assembly Dashboard - Live Camera Demo"
echo "======================================================="
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

# Start the webcam demo server
echo "📱 Starting webcam demo server on port 3000..."
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
echo "🎥 Vision Assembly Dashboard with LIVE CAMERA is now running!"
echo "=============================================================="
echo "📊 API Server:          http://localhost:4000"
echo "📚 API Health:          http://localhost:4000/api/health"  
echo "📹 WEBCAM DASHBOARD:    http://localhost:3000"
echo "📊 Basic Dashboard:     http://localhost:3000/basic"
echo ""
echo "🎬 NEW CAMERA FEATURES:"
echo "  📹 Live webcam video feed"
echo "  🔍 Real-time AI defect detection overlays"
echo "  📊 Automatic inspection statistics"
echo "  🎯 Visual defect bounding boxes"  
echo "  📈 Pass/fail rate tracking"
echo ""
echo "🎭 HOW TO USE:"
echo "  1. Open http://localhost:3000 in your browser"
echo "  2. Click '▶️ Start Camera' button"
echo "  3. Allow camera access when prompted"
echo "  4. Watch live defect detection in action!"
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

# Keep the script running and show status
while true; do
    sleep 5
    # Check if processes are still running
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "❌ API server stopped unexpectedly"
        break
    fi
    if ! kill -0 $WEB_PID 2>/dev/null; then
        echo "❌ Web server stopped unexpectedly"
        break
    fi
done