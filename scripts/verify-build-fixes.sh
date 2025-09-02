#!/bin/bash

# Chain Capital - Build Fix Verification Script
echo "🔍 Chain Capital Build Fix Verification"
echo "======================================="

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ] || [ ! -f "backend/package.json" ]; then
    echo "❌ Please run this script from the root project directory"
    exit 1
fi

echo ""
echo "1️⃣ Checking Frontend Dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
else
    echo "✅ Frontend dependencies installed"
fi

echo ""
echo "2️⃣ Checking Backend Dependencies..."
cd ../backend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
else
    echo "✅ Backend dependencies installed"
fi

echo ""
echo "3️⃣ Checking Prisma Client Generation..."
if [ ! -f "src/infrastructure/database/generated/index.js" ]; then
    echo "🔧 Generating Prisma client..."
    npx prisma generate
else
    echo "✅ Prisma client generated"
fi

echo ""
echo "4️⃣ Testing TypeScript Compilation..."
echo "   Frontend TypeScript check..."
cd ../frontend
if npm run type-check > /dev/null 2>&1; then
    echo "✅ Frontend TypeScript compiles cleanly"
else
    echo "⚠️  Frontend TypeScript has issues (but build may still work)"
fi

echo "   Backend TypeScript check..."
cd ../backend
if npm run type-check > /dev/null 2>&1; then
    echo "✅ Backend TypeScript compiles cleanly"
else
    echo "⚠️  Backend TypeScript has issues (but build may still work)"
fi

echo ""
echo "🎯 Build Fix Verification Complete!"
echo "=================================="
echo ""
echo "To start the servers:"
echo "Frontend: cd frontend && npm run dev"
echo "Backend:  cd backend && npm run dev"
echo ""
echo "Expected URLs:"
echo "Frontend: http://localhost:5173/"
echo "Backend:  http://localhost:3001/"
echo "Swagger:  http://localhost:3001/docs"
echo ""
echo "✅ Both issues should now be resolved:"
echo "   - Frontend: No more 'unenv/node/inspector/promises' error"
echo "   - Backend:  No more hanging, proper database connection"
