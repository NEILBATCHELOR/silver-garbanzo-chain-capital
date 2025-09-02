#!/usr/bin/env node

/**
 * Backend Service Fix Script
 * Automatically fixes TypeScript errors in backend services after Prisma regeneration
 */

const fs = require('fs')
const path = require('path')

// Define the mappings from camelCase to snake_case for database tables
const tableNameMappings = {
  // Tables
  'this.db.user': 'this.db.users',
  'this.db.role': 'this.db.roles',
  'this.db.userRole': 'this.db.user_roles',
  'this.db.project': 'this.db.projects',
  'this.db.capTable': 'this.db.cap_tables',
  'this.db.investor': 'this.db.investors',
  'this.db.subscription': 'this.db.subscriptions',
  'this.db.tokenAllocation': 'this.db.token_allocations',
  'this.db.distribution': 'this.db.distributions',
  'this.db.investorGroup': 'this.db.investor_groups',
  'this.db.investorGroupMember': 'this.db.investor_group_members',
  'this.db.capTableInvestor': 'this.db.cap_table_investors',
  'this.db.investorApproval': 'this.db.investor_approvals',
  'this.db.auditLog': 'this.db.audit_logs',
  'this.db.token': 'this.db.tokens',

  // Field mappings for includes and queries
  'userRoles': 'user_roles',
  'roleEntity': 'role',
  'rolePermissions': 'role_permissions',
  'permissionName': 'permission_name',
  'projectId': 'project_id',
  'investorId': 'investor_id',
  'phoneNumber': 'phone_number',
  'emailVerified': 'email_verified',
  'phoneVerified': 'phone_verified',
  'lastSignIn': 'last_sign_in',
  'createdAt': 'created_at',
  'updatedAt': 'updated_at',
  'deletedAt': 'deleted_at',
  'userId': 'user_id',
  'roleId': 'role_id',
  'userId_roleId': 'user_id_role_id',
  'investorType': 'investor_type',
  'kycStatus': 'kyc_status',
  'accreditationStatus': 'accreditation_status',
  'taxIdNumber': 'tax_id_number',
  'residenceCountry': 'residence_country',
  'dateOfBirth': 'date_of_birth',
  'riskTolerance': 'risk_tolerance',
  'investmentExperience': 'investment_experience',
  'employmentStatus': 'employment_status',
  'annualIncome': 'annual_income',
  'netWorth': 'net_worth',
  'sourceOfFunds': 'source_of_funds',
  'investmentObjectives': 'investment_objectives',
  'complianceNotes': 'compliance_notes',
  'isActive': 'is_active',
  'onboardingCompleted': 'onboarding_completed',
  'subscriptionAmount': 'subscription_amount',
  'paymentMethod': 'payment_method',
  'paymentStatus': 'payment_status',
  'subscriptionDate': 'subscription_date',
  'tokenAllocations': 'token_allocations',
  'tokenAmount': 'token_amount',
  'tokenType': 'token_type',
  'allocationDate': 'allocation_date',
  'distributionDate': 'distribution_date',
  'distributionTxHash': 'distribution_tx_hash',
  'walletAddress': 'wallet_address'
}

// Files to process
const serviceFiles = [
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/captable/CapTableAnalyticsService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/captable/CapTableValidationService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorAnalyticsService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorGroupService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/projects/ProjectService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/projects/ProjectAnalyticsService.ts'
]

console.log('🔧 Starting Backend Service Fix Script...')

serviceFiles.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`)
      return
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let changed = false

    // Apply all mappings
    Object.entries(tableNameMappings).forEach(([from, to]) => {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from, 'g'), to)
        changed = true
      }
    })

    if (changed) {
      fs.writeFileSync(filePath, content)
      console.log(`✅ Fixed: ${path.basename(filePath)}`)
    } else {
      console.log(`✨ No changes needed: ${path.basename(filePath)}`)
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
  }
})

console.log('🎉 Backend Service Fix Script completed!')
