#!/bin/bash

# Chain Capital HSM Integration - Fixed Test Suite Runner
# This script runs the fixed HSM integration test suite that resolves all database timing issues

echo "🔐 Chain Capital HSM Integration - Fixed Test Suite"
echo "=================================================="
echo ""
echo "Running fixed test suite that resolves database transaction timing issues..."
echo ""

# Navigate to backend directory
cd backend

# Make the test executable
chmod +x test-hsm-integration-fixed.ts

# Run the fixed test suite
tsx test-hsm-integration-fixed.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS: All HSM integration tests passed!"
    echo "✅ Database transaction timing issues resolved"
    echo "✅ HSM integration is production ready"
    echo ""
    echo "Next steps:"
    echo "1. Choose your HSM provider (memory, aws-cloudhsm, azure-keyvault, google-cloud-kms)"
    echo "2. Set environment variables for your chosen provider"
    echo "3. Run 'npm run hsm:health' to validate connectivity"
    echo "4. Deploy to production with your chosen HSM provider"
else
    echo ""
    echo "❌ FAILURE: Some tests failed"
    echo "⚠️  Check the output above for error details"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure database connectivity is working"
    echo "2. Check that Prisma client is properly configured"
    echo "3. Verify environment variables are set correctly"
    echo "4. Try running with HSM_PROVIDER=memory for testing"
fi

echo ""
echo "📚 Documentation:"
echo "- Production deployment guide: /docs/hsm-production-deployment-guide.md"
echo "- Resolution summary: /docs/hsm-topics-resolution-complete.md"
echo "- README: /docs/hsm-integration-resolution-README.md"
