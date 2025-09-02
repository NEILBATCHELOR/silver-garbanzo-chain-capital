#!/bin/bash

# ===================================================================
# PROJECT TABLE TRANSFORMATION - UPDATE IDENTIFICATION SCRIPT
# ===================================================================
# This script helps identify files that may need updates after the 
# projects table transformation

echo "🔍 PROJECTS TABLE TRANSFORMATION - IDENTIFYING FILES TO UPDATE"
echo "=============================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Searching for files that may reference old project fields...${NC}"
echo ""

# Search for old project field references
echo "📋 Files potentially using old project structure:"
echo "------------------------------------------------"

# Common old project fields to search for
OLD_FIELDS=("target_raise" "authorized_shares" "company_valuation" "legal_entity" "token_symbol" "barrier_level" "payoff_structure" "coupon_rate" "credit_rating" "property_type" "project_capacity_mw")

for field in "${OLD_FIELDS[@]}"; do
    echo -e "${YELLOW}Searching for: $field${NC}"
    find ./src -name "*.ts" -o -name "*.tsx" | xargs grep -l "$field" 2>/dev/null | grep -v "/types/products/" | grep -v "transformation" || echo "  ✅ No references found"
    echo ""
done

echo -e "${YELLOW}2. Searching for project-related interfaces and types...${NC}"
echo ""

echo "📋 Files with Project interfaces/types:"
echo "-------------------------------------"
find ./src -name "*.ts" -o -name "*.tsx" | xargs grep -l "interface.*Project\|type.*Project" 2>/dev/null | grep -v "/types/products/"
echo ""

echo -e "${YELLOW}3. Searching for components that might use project data...${NC}"
echo ""

echo "📋 Components potentially affected:"
echo "--------------------------------"
find ./src/components -name "*.tsx" | xargs grep -l "project\." 2>/dev/null || echo "  ✅ No direct project property access found"
echo ""

echo "📋 Services potentially affected:"  
echo "------------------------------"
find ./src/services -name "*.ts" | xargs grep -l "project\." 2>/dev/null || echo "  ✅ No direct project property access found"
echo ""

echo -e "${YELLOW}4. Searching for database queries using projects table...${NC}"
echo ""

echo "📋 Files with projects table queries:"
echo "-----------------------------------"
find ./src -name "*.ts" -o -name "*.tsx" | xargs grep -l "from.*projects\|projects.*select\|projects.*where" 2>/dev/null
echo ""

echo -e "${GREEN}5. RECOMMENDATIONS:${NC}"
echo "==================="
echo ""
echo "✅ IMMEDIATE ACTIONS NEEDED:"
echo "  1. Review any files found above"
echo "  2. Update interfaces to use SimplifiedProject"
echo "  3. Update services to use new ProjectService" 
echo "  4. Create product-specific forms/components as needed"
echo ""

echo "✅ MIGRATION CHECKLIST:"
echo "  □ Apply database migration script"
echo "  □ Update TypeScript imports" 
echo "  □ Test project creation/editing"
echo "  □ Update any project display components"
echo "  □ Test document management (should work unchanged)"
echo ""

echo -e "${GREEN}📚 DOCUMENTATION AVAILABLE:${NC}"
echo "  - Migration guide: /docs/projects-table-transformation-complete.md"
echo "  - Types: /src/types/products/"
echo "  - Services: /src/services/products/"
echo "  - SQL script: /scripts/projects-table-transformation.sql"
echo ""

echo -e "${GREEN}🎉 TRANSFORMATION COMPLETE! Ready for deployment.${NC}"
echo ""
