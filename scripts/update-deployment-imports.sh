#!/bin/bash

# Script to update all deployment type imports to use consolidated types
# This script updates all imports from deprecated deployment type files

echo "🔄 Updating deployment type imports..."

# Update imports from deployment.ts to TokenDeploymentTypes.ts
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/types/deployment/deployment|@/types/deployment/TokenDeploymentTypes|g'

# Update imports from deploy.ts to TokenDeploymentTypes.ts  
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/types/deployment/deploy|@/types/deployment/TokenDeploymentTypes|g'

# Update any remaining index imports to point to the new structure
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's|@/types/deployment|@/types/deployment/TokenDeploymentTypes|g'

echo "✅ Updated deployment type imports"
echo "📝 All imports now point to consolidated TokenDeploymentTypes.ts"
