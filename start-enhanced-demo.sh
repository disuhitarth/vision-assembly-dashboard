#!/bin/bash

# 🏭 Industrial Vision Assembly Dashboard - Enhanced Demo Startup
# One-command setup for complete industrial vision system

echo ""
echo "🏭 =============================================================="
echo "   INDUSTRIAL VISION ASSEMBLY DASHBOARD - ENHANCED EDITION"
echo "   AI-Powered Quality Control & Production Monitoring System"
echo "=============================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo ""
    echo "📥 Please install Node.js 18+ from: https://nodejs.org"
    echo "   Then run this script again."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "⚠️  Node.js $NODE_VERSION detected. Recommended: Node.js 18+"
    echo "   System may work but upgrade recommended."
else
    echo "✅ Node.js $(node --version) detected - Perfect!"
fi

echo ""

# Clean up existing processes
echo "🧹 Cleaning up any existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 2

# Start API Server
echo "🚀 Starting Industrial API Server (Port 4000)..."
node simple-api.js &
API_PID=$!
sleep 3

# Test API
echo "🔍 Testing API connection..."
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo "✅ API Server: ONLINE and responding"
else
    echo "❌ API Server failed to start"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check if port 4000 is available: lsof -i :4000"
    echo "   • View error logs: cat /tmp/api-error.log"
    exit 1
fi

# Start Dashboard Server  
echo "🌐 Starting Enhanced Dashboard Server (Port 3000)..."
node serve-demo.js &
WEB_PID=$!
sleep 2

# Test Dashboard
echo "🔍 Testing dashboard server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dashboard Server: ONLINE and serving"
else
    echo "❌ Dashboard server failed to start"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check if port 3000 is available: lsof -i :3000"
    echo "   • Try manual start: node serve-demo.js"
    exit 1
fi

echo ""
echo "🎉 =============================================================="
echo "   SUCCESS! INDUSTRIAL VISION DASHBOARD IS NOW RUNNING!"
echo "=============================================================="
echo ""
echo "🌐 ACCESS YOUR DASHBOARD:"
echo "   📊 Enhanced Dashboard:  http://localhost:3000"
echo "   📹 Simple Camera Demo:  http://localhost:3000/webcam"  
echo "   📈 Basic Dashboard:     http://localhost:3000/basic"
echo ""
echo "📡 API ENDPOINTS:"
echo "   🔍 Health Check:        http://localhost:4000/api/health"
echo "   📊 Dashboard Data:      http://localhost:4000/api/dashboard/status"
echo "   🏭 PLC Tags:           http://localhost:4000/api/plc/tags"
echo ""
echo "✨ ENHANCED FEATURES INCLUDED:"
echo "   📹 Live Camera Integration    🤖 AI Defect Detection"
echo "   📊 Real-time Charts          🚨 Alarm Management"
echo "   📈 Statistical Process Control   🎛️ Emergency Controls"
echo "   💡 Built-in Help System     🎯 Multi-tab Interface"
echo "   📱 Mobile Responsive        🏭 Industrial UI/UX"
echo ""
echo "🎬 QUICK START GUIDE:"
echo "   1. 🌐 Open: http://localhost:3000"
echo "   2. ❓ Click 'Help' button for comprehensive guide"
echo "   3. ▶️ Click 'Start Camera' to enable live vision"  
echo "   4. 👀 Watch AI defect detection in action!"
echo "   5. 📊 Explore tabs: Overview → Vision → Analytics → Quality"
echo ""
echo "🎯 CURRENT SYSTEM STATUS:"

# Get production stats
if STATS=$(curl -s http://localhost:4000/api/dashboard/status 2>/dev/null); then
    PARTS=$(echo "$STATS" | grep -o '"partCounter":[0-9]*' | cut -d':' -f2)
    LINE_STATE=$(echo "$STATS" | grep -o '"lineState":[0-9]*' | cut -d':' -f2)
    OEE=$(echo "$STATS" | grep -o '"oeeScore":[0-9.]*' | cut -d':' -f2)
    QUALITY=$(echo "$STATS" | grep -o '"qualityScore":[0-9.]*' | cut -d':' -f2)
    
    case $LINE_STATE in
        0) STATUS="🔴 STOPPED" ;;
        1) STATUS="🟢 RUNNING" ;;
        2) STATUS="🟡 PAUSED" ;;
        3) STATUS="🔴 FAULT" ;;
        *) STATUS="🔵 UNKNOWN" ;;
    esac
    
    echo "   🏭 Production Line:     $STATUS"
    echo "   📦 Parts Produced:     $PARTS+"
    echo "   📊 OEE Score:         $OEE%"
    echo "   🎯 Quality Score:     $QUALITY%"
    echo "   ⚡ Real-time Updates:  ✅ ACTIVE"
else
    echo "   📊 Status: Initializing..."
fi

echo ""
echo "🎭 DEMO TIPS:"
echo "   • Use good lighting for best camera 'defect detection'"
echo "   • Try the emergency stop button to test safety systems"
echo "   • Check different tabs to see all features"
echo "   • Monitor the event log for real-time activity"
echo ""
echo "🆘 NEED HELP?"
echo "   • Built-in Help: Click ❓ button in dashboard"
echo "   • Documentation: Open README.md file"  
echo "   • API Reference: docs/API_REFERENCE.md"
echo "   • Troubleshooting: Check console for errors"
echo ""
echo "⚠️  TO STOP ALL SERVICES: Press Ctrl+C"
echo ""
echo "🎉 READY TO IMPRESS! Open http://localhost:3000 now!"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down Industrial Vision Dashboard..."
    echo ""
    
    if kill -0 $API_PID 2>/dev/null; then
        echo "🔌 Stopping API Server..."
        kill $API_PID 2>/dev/null
    fi
    
    if kill -0 $WEB_PID 2>/dev/null; then
        echo "🌐 Stopping Dashboard Server..."
        kill $WEB_PID 2>/dev/null
    fi
    
    # Clean up any remaining processes
    lsof -ti:4000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo "✅ All services stopped cleanly"
    echo ""
    echo "👋 Thank you for using Industrial Vision Dashboard!"
    echo "   Star ⭐ this project if it impressed you!"
    echo ""
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM EXIT

# Keep script running and monitor services
echo "🔄 Monitoring services... (Press Ctrl+C to stop)"
echo ""

while true; do
    sleep 10
    
    # Check if processes are still running
    if ! kill -0 $API_PID 2>/dev/null; then
        echo "❌ $(date '+%H:%M:%S') - API server stopped unexpectedly"
        echo "🔧 Check logs: ps aux | grep node"
        break
    fi
    
    if ! kill -0 $WEB_PID 2>/dev/null; then
        echo "❌ $(date '+%H:%M:%S') - Dashboard server stopped unexpectedly"  
        echo "🔧 Check logs: ps aux | grep node"
        break
    fi
    
    # Optional: Show periodic status (every 60 seconds)
    if [ $(($(date +%s) % 60)) -eq 0 ]; then
        if STATS=$(curl -s http://localhost:4000/api/dashboard/status 2>/dev/null); then
            PARTS=$(echo "$STATS" | grep -o '"partCounter":[0-9]*' | cut -d':' -f2)
            echo "📊 $(date '+%H:%M:%S') - System Status: ✅ Online | Parts: $PARTS | Dashboard: http://localhost:3000"
        fi
    fi
done