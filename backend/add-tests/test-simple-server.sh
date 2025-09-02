#!/bin/bash

# Test the simplified backend server
echo "🧪 Testing Simplified Backend Server"
echo "=================================="

cd /Users/neilbatchelor/Cursor/Chain\ Capital\ Production-build-progress/backend

echo "Starting server with tsx..."
timeout 10 npx tsx src/server-simple.ts &
SERVER_PID=$!

sleep 5

echo ""
echo "Testing health endpoint..."
if curl -s http://localhost:3001/health | grep -q "healthy"; then
    echo "✅ Server is working!"
else
    echo "❌ Server not responding"
fi

echo ""
echo "Stopping server..."
kill $SERVER_PID 2>/dev/null

echo "Done."
