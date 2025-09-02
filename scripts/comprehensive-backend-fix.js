#!/usr/bin/env node

/**
 * Comprehensive Backend Service Database Table Fix Script
 * Fixes all database table references from camelCase to snake_case
 */

const fs = require('fs')
const path = require('path')

// Comprehensive mapping of all database table and field references
const replacementMap = new Map([
  // Database table references
  ['this.db.user', 'this.db.users'],
  ['this.db.role', 'this.db.roles'],
  ['this.db.userRole', 'this.db.user_roles'],
  ['this.db.project', 'this.db.projects'],
  ['this.db.capTable', 'this.db.cap_tables'],
  ['this.db.investor', 'this.db.investors'],
  ['this.db.subscription', 'this.db.subscriptions'],
  ['this.db.tokenAllocation', 'this.db.token_allocations'],
  ['this.db.distribution', 'this.db.distributions'],
  ['this.db.investorGroup', 'this.db.investor_groups'],
  ['this.db.investorGroupMember', 'this.db.investor_group_members'],
  ['this.db.capTableInvestor', 'this.db.cap_table_investors'],
  ['this.db.investorApproval', 'this.db.investor_approvals'],
  ['this.db.auditLog', 'this.db.audit_logs'],
  ['this.db.token', 'this.db.tokens'],
  
  // Field names in queries and includes
  ['userRoles:', 'user_roles:'],
  ['roleEntity:', 'role:'],
  ['rolePermissions:', 'role_permissions:'],
  ['permissionName:', 'permission_name:'],
  ['phoneNumber:', 'phone_number:'],
  ['emailVerified:', 'email_verified:'],
  ['phoneVerified:', 'phone_verified:'],
  ['lastSignIn:', 'last_sign_in:'],
  ['createdAt:', 'created_at:'],
  ['updatedAt:', 'updated_at:'],
  ['deletedAt:', 'deleted_at:'],
  ['userId:', 'user_id:'],
  ['roleId:', 'role_id:'],
  ['projectId:', 'project_id:'],
  ['investorId:', 'investor_id:'],
  ['subscriptionId:', 'subscription_id:'],
  ['tokenId:', 'token_id:'],
  ['groupId:', 'group_id:'],
  ['capTableId:', 'cap_table_id:'],
  ['investorType:', 'investor_type:'],
  ['kycStatus:', 'kyc_status:'],
  ['accreditationStatus:', 'accreditation_status:'],
  ['taxIdNumber:', 'tax_id_number:'],
  ['residenceCountry:', 'residence_country:'],
  ['dateOfBirth:', 'date_of_birth:'],
  ['riskTolerance:', 'risk_tolerance:'],
  ['investmentExperience:', 'investment_experience:'],
  ['employmentStatus:', 'employment_status:'],
  ['annualIncome:', 'annual_income:'],
  ['netWorth:', 'net_worth:'],
  ['sourceOfFunds:', 'source_of_funds:'],
  ['investmentObjectives:', 'investment_objectives:'],
  ['complianceNotes:', 'compliance_notes:'],
  ['isActive:', 'is_active:'],
  ['onboardingCompleted:', 'onboarding_completed:'],
  ['subscriptionAmount:', 'subscription_amount:'],
  ['paymentMethod:', 'payment_method:'],
  ['paymentStatus:', 'payment_status:'],
  ['subscriptionDate:', 'subscription_date:'],
  ['tokenAmount:', 'token_amount:'],
  ['tokenType:', 'token_type:'],
  ['allocationDate:', 'allocation_date:'],
  ['distributionDate:', 'distribution_date:'],
  ['distributionTxHash:', 'distribution_tx_hash:'],
  ['walletAddress:', 'wallet_address:'],
  ['memberCount:', 'member_count:'],
  
  // Where clause field references  
  ['where: { email', 'where: { email'],
  ['where: { userId', 'where: { user_id'],
  ['where: { roleId', 'where: { role_id'],
  ['where: { projectId', 'where: { project_id'],
  ['where: { investorId', 'where: { investor_id'],
  ['where: { subscriptionId', 'where: { subscription_id'],
  ['where: { groupId', 'where: { group_id'],
  ['where: { capTableId', 'where: { cap_table_id'],
  ['where: { investorType', 'where: { investor_type'],
  ['where: { kycStatus', 'where: { kyc_status'],
  ['where: { tokenType', 'where: { token_type'],
  
  // Data field references in create/update operations
  ['data: {\\s*userId:', 'data: {\\s*user_id:'],
  ['data: {\\s*roleId:', 'data: {\\s*role_id:'],
  ['data: {\\s*projectId:', 'data: {\\s*project_id:'],
  ['data: {\\s*investorId:', 'data: {\\s*investor_id:'],
  
  // Unique constraint references
  ['userId_roleId:', 'user_id_role_id:'],
  
  // Common property accesses
  ['.userId', '.user_id'],
  ['.roleId', '.role_id'],
  ['.projectId', '.project_id'],
  ['.investorId', '.investor_id'],
  ['.phoneNumber', '.phone_number'],
  ['.emailVerified', '.email_verified'],
  ['.lastSignIn', '.last_sign_in'],
  ['.createdAt', '.created_at'],
  ['.updatedAt', '.updated_at'],
  ['.deletedAt', '.deleted_at'],
  ['.kycStatus', '.kyc_status'],
  ['.investorType', '.investor_type'],
  ['.subscriptionAmount', '.subscription_amount'],
  ['.tokenAmount', '.token_amount'],
  ['.walletAddress', '.wallet_address'],
  
  // Parameter types (common in reduce functions)
  ['(sum, s) =>', '(sum: any, s: any) =>'],
  ['(sum, sub) =>', '(sum: any, sub: any) =>'],
  ['(sum, alloc) =>', '(sum: any, alloc: any) =>'],
  ['(sum, dist) =>', '(sum: any, dist: any) =>'],
  ['(a, b) =>', '(a: any, b: any) =>'],
  ['(entry) =>', '(entry: any) =>'],
  ['(investor) =>', '(investor: any) =>'],
  ['(member) =>', '(member: any) =>'],
])

// Files to process - all backend service files
const serviceFiles = [
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/captable/CapTableAnalyticsService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/captable/CapTableValidationService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorAnalyticsService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorGroupService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/investors/InvestorValidationService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/projects/ProjectService.ts',
  '/Users/neilbatchelor/Cursor/Chain Capital Production-build-progress/backend/src/services/projects/ProjectAnalyticsService.ts'
]

console.log('🚀 Starting Comprehensive Backend Service Database Fix...')
console.log(`📁 Processing ${serviceFiles.length} service files...`)

let totalFilesProcessed = 0
let totalFilesChanged = 0
let totalReplacements = 0

serviceFiles.forEach((filePath, index) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${path.basename(filePath)}`)
      return
    }

    let content = fs.readFileSync(filePath, 'utf8')
    let fileChanged = false
    let fileReplacements = 0

    // Apply all replacements
    replacementMap.forEach((replacement, pattern) => {
      // Use regex for more flexible matching
      const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      const matches = content.match(regex)
      
      if (matches) {
        content = content.replace(regex, replacement)
        fileChanged = true
        fileReplacements += matches.length
        totalReplacements += matches.length
      }
    })

    if (fileChanged) {
      fs.writeFileSync(filePath, content)
      console.log(`✅ Fixed: ${path.basename(filePath)} (${fileReplacements} replacements)`)
      totalFilesChanged++
    } else {
      console.log(`✨ No changes needed: ${path.basename(filePath)}`)
    }

    totalFilesProcessed++

  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error.message)
  }
})

console.log('\\n📊 Summary:')
console.log(`📁 Files processed: ${totalFilesProcessed}`)
console.log(`🔧 Files changed: ${totalFilesChanged}`)
console.log(`🔄 Total replacements: ${totalReplacements}`)
console.log('\\n🎉 Comprehensive Backend Service Database Fix completed!')

console.log('\\n📋 Next steps:')
console.log('1. Run: npm run build')
console.log('2. Check for any remaining TypeScript errors')
console.log('3. Test the services to ensure functionality')
console.log('4. Review any custom logic that might need manual adjustment')
