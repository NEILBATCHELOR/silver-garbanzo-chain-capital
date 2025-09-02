/**
 * Test file to verify compliance service exports work correctly
 */

import {
  ComplianceService,
  KycService,
  DocumentComplianceService,
  OrganizationComplianceService,
  ComplianceServiceFactory
} from './index'

// Test that we can instantiate the services
const complianceService = new ComplianceService()
const kycService = new KycService()
const documentComplianceService = new DocumentComplianceService()
const organizationComplianceService = new OrganizationComplianceService()

// Test that factory methods work
const factoryComplianceService = ComplianceServiceFactory.getComplianceService()
const factoryKycService = ComplianceServiceFactory.getKycService()
const factoryDocumentComplianceService = ComplianceServiceFactory.getDocumentComplianceService()
const factoryOrganizationComplianceService = ComplianceServiceFactory.getOrganizationComplianceService()

// Test that getAllServices works
const allServices = ComplianceServiceFactory.getAllServices()

console.log('All compliance services imported and instantiated successfully!')

export {}
