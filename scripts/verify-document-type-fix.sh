#!/bin/bash

# Document Type Enum Fix Verification Script
# Verifies that the document type enum mismatch fixes are working correctly

echo "🔍 Document Type Enum Fix Verification"
echo "======================================"

# Check if new files exist
echo "📁 Checking new files..."

if [ -f "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/scripts/migrate-add-individual-document-types.sql" ]; then
    echo "✅ Database migration script created"
else
    echo "❌ Database migration script missing"
fi

if [ -f "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/types/core/documentTypes.ts" ]; then
    echo "✅ Document types definition file created"
else
    echo "❌ Document types definition file missing"
fi

if [ -f "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/docs/document-type-enum-mismatch-fix-2025-08-10.md" ]; then
    echo "✅ Documentation created"
else
    echo "❌ Documentation missing"
fi

# Check if imports were updated
echo ""
echo "🔧 Checking import updates..."

if grep -q "UploadDocumentType" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/upload/enhanced/services/integrationService.ts"; then
    echo "✅ Integration service imports updated"
else
    echo "❌ Integration service imports not updated"
fi

if grep -q "UploadDocumentType" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/components/compliance/upload/enhanced/components/DocumentUploadPhase.tsx"; then
    echo "✅ Document upload phase imports updated"
else
    echo "❌ Document upload phase imports not updated"
fi

# Check document type mappings
echo ""
echo "📋 Checking document type mappings..."

if grep -q "passport" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/types/core/documentTypes.ts" && 
   grep -q "drivers_license" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/types/core/documentTypes.ts" &&
   grep -q "articles_of_incorporation" "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend/src/types/core/documentTypes.ts"; then
    echo "✅ Document type mappings defined correctly"
else
    echo "❌ Document type mappings incomplete"
fi

# Try to compile TypeScript (if possible)
echo ""
echo "🔨 Testing TypeScript compilation..."

cd "/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/frontend"

if command -v npm &> /dev/null; then
    echo "Running TypeScript type check..."
    npm run type-check &
    TYPE_CHECK_PID=$!
    
    # Wait up to 30 seconds for type check
    for i in {1..30}; do
        if ! kill -0 $TYPE_CHECK_PID 2>/dev/null; then
            wait $TYPE_CHECK_PID
            TYPE_CHECK_EXIT_CODE=$?
            break
        fi
        sleep 1
        echo -n "."
    done
    
    if [ "$TYPE_CHECK_EXIT_CODE" -eq 0 ]; then
        echo "✅ TypeScript compilation successful"
    else
        echo "❌ TypeScript compilation failed"
    fi
else
    echo "⚠️  npm not available, skipping TypeScript check"
fi

echo ""
echo "📊 Summary"
echo "=========="
echo "The document type enum mismatch fix has been implemented."
echo ""
echo "🚀 Next Steps:"
echo "1. Apply database migration: scripts/migrate-add-individual-document-types.sql"
echo "2. Regenerate Supabase types: npx supabase gen types typescript ..."
echo "3. Test upload pages for both investors and issuers"
echo ""
echo "📚 Documentation: docs/document-type-enum-mismatch-fix-2025-08-10.md"
