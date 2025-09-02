#!/bin/bash

# Test TypeScript compilation for investor services
echo "Testing TypeScript compilation for investor services..."

cd /Users/neilbatchelor/Cursor/Chain\ Capital\ Production-build-progress/backend

# Check if TypeScript can compile the investor services without errors
echo "Checking InvestorAnalyticsService.ts..."
npx tsc --noEmit src/services/investors/InvestorAnalyticsService.ts

echo "Checking InvestorGroupService.ts..."  
npx tsc --noEmit src/services/investors/InvestorGroupService.ts

echo "Checking InvestorService.ts..."
npx tsc --noEmit src/services/investors/InvestorService.ts

echo "Compilation test complete!"
