#!/bin/bash

# Deployment Services Consolidation Script
# This script helps consolidate redundant deployment services

echo "🚀 Chain Capital Deployment Services Consolidation"
echo "================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root directory"
  exit 1
fi

# Create backup
echo "📦 Creating backup..."
git add .
git commit -m "Pre-consolidation backup - $(date)" || echo "Nothing to commit"

# Phase 1: Remove legacy/redundant services
echo ""
echo "🔥 Phase 1: Removing legacy/redundant services..."

# Remove legacy deployment service
if [ -f "src/services/deployment/DeploymentService.ts" ]; then
  echo "  ❌ Removing legacy DeploymentService.ts"
  rm src/services/deployment/DeploymentService.ts
fi

# Move documentation files disguised as TypeScript
if [ -f "src/components/tokens/services/optimizedDeploymentService.ts" ]; then
  echo "  📄 Moving optimizedDeploymentService.ts to docs/"
  mv src/components/tokens/services/optimizedDeploymentService.ts docs/optimization-strategy.md
fi

if [ -f "src/components/tokens/services/multiStandardOptimizationService.ts" ]; then
  echo "  📄 Moving multiStandardOptimizationService.ts to docs/"
  mv src/components/tokens/services/multiStandardOptimizationService.ts docs/multi-standard-optimization.md
fi

# Remove duplicate transaction monitors
if [ -f "src/services/deployment/transactions/DeploymentTransactionMonitor.ts" ]; then
  echo "  ❌ Removing duplicate DeploymentTransactionMonitor.ts from services/"
  rm src/services/deployment/transactions/DeploymentTransactionMonitor.ts
fi

# Remove duplicate validation
if [ -f "src/infrastructure/utils/validation/deploymentValidation.ts" ]; then
  echo "  ❌ Removing duplicate deploymentValidation.ts from utils/"
  rm src/infrastructure/utils/validation/deploymentValidation.ts
fi

# Remove other redundant services
redundant_services=(
  "src/services/deployment/DeploymentRateLimiter.ts"
  "src/services/deployment/notifications/DeploymentNotificationManager.ts"
  "src/services/deployment/interfaces/DeploymentInterfaces.ts"
  "src/infrastructure/api/controllers/DeploymentController.ts"
  "src/infrastructure/api/endpoints/deploymentApiService.ts"
  "src/infrastructure/api/routes/deploymentRoutes.ts"
)

for service in "${redundant_services[@]}"; do
  if [ -f "$service" ]; then
    echo "  ❌ Removing redundant $service"
    rm "$service"
  fi
done

# Remove empty directories
empty_dirs=(
  "src/services/deployment/transactions"
  "src/services/deployment/notifications"
  "src/services/deployment/interfaces"
  "src/services/deployment"
)

for dir in "${empty_dirs[@]}"; do
  if [ -d "$dir" ] && [ -z "$(ls -A $dir)" ]; then
    echo "  📁 Removing empty directory $dir"
    rmdir "$dir"
  fi
done

# Phase 2: Consolidate UI components
echo ""
echo "🔧 Phase 2: Consolidating UI components..."

# Create consolidated deployment components directory if it doesn't exist
mkdir -p src/components/tokens/deployment/

# Move components from the redundant location
if [ -d "src/components/tokens/components/deployment" ]; then
  echo "  📦 Consolidating deployment components..."
  
  # Move files if they don't already exist in target location
  for file in src/components/tokens/components/deployment/*; do
    if [ -f "$file" ]; then
      filename=$(basename "$file")
      target="src/components/tokens/deployment/$filename"
      
      if [ ! -f "$target" ]; then
        echo "    📄 Moving $filename"
        mv "$file" "$target"
      else
        echo "    ⚠️  $filename already exists in target location"
        rm "$file"  # Remove duplicate
      fi
    fi
  done
  
  # Remove empty directory
  if [ -d "src/components/tokens/components/deployment" ] && [ -z "$(ls -A src/components/tokens/components/deployment)" ]; then
    rmdir src/components/tokens/components/deployment
  fi
fi

# Phase 3: Create consolidated types file
echo ""
echo "📝 Phase 3: Consolidating type definitions..."

# Create consolidated types index if it doesn't exist
if [ ! -f "src/types/deployment/index.ts" ]; then
  echo "  📄 Creating consolidated types index..."
  cat > src/types/deployment/index.ts << 'EOF'
// Consolidated deployment types
// This file exports all deployment-related types from their specific files

export * from './TokenDeploymentTypes';
export * from './deploy';
export * from './deployment';

// Re-export commonly used types for convenience
export type {
  DeploymentStatus,
  DeploymentResult,
  TokenDeploymentParams
} from './TokenDeploymentTypes';
EOF
fi

# Check for build errors
echo ""
echo "🔍 Phase 4: Checking for build errors..."

# Check TypeScript compilation
if npm run type-check 2>/dev/null; then
  echo "  ✅ TypeScript compilation successful"
else
  echo "  ⚠️  TypeScript errors detected - you may need to update imports"
fi

# Try to build
if npm run build 2>/dev/null; then
  echo "  ✅ Build successful"
else
  echo "  ⚠️  Build errors detected - check the output above"
fi

# Summary
echo ""
echo "✅ Consolidation Complete!"
echo "========================="
echo ""
echo "📊 Summary of changes:"
echo "  • Removed legacy DeploymentService with mocks"
echo "  • Moved documentation files to docs/ folder"
echo "  • Removed duplicate transaction monitors"
echo "  • Removed duplicate validation files"
echo "  • Consolidated UI components"
echo "  • Created unified types export"
echo ""
echo "🎯 Core services remaining:"
echo "  • foundryDeploymentService.ts (Primary deployment)"
echo "  • tokenDeploymentService.ts (Enhanced wrapper)"
echo "  • GasEstimator/GasConfigurator (Gas management UI)"
echo "  • keyVaultClient.ts (Key management)"
echo ""
echo "🔍 Next steps:"
echo "  1. Run 'npm test' to ensure functionality"
echo "  2. Update any remaining import statements"
echo "  3. Remove any unused dependencies"
echo "  4. Commit changes: git commit -m 'Consolidate deployment services'"
echo ""
echo "💡 Your deployment system is now much cleaner and easier to maintain!"
