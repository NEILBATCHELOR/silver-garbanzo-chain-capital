/**
 * ERC-1400 Test Examples
 * 
 * Comprehensive test data examples for validating ERC-1400 token functionality
 * including all related database tables and CRUD operations.
 */

import { TokenStandard } from '@/types/core/centralModels';

/**
 * Enhanced ERC-1400 example based on the CIRF (Corporate Invoice Receivables Fund) 
 * from project knowledge, designed to test all database table relationships.
 */
export const erc1400ComprehensiveExample = {
  name: "Corporate Invoice Receivables Fund",
  symbol: "CIRF",
  standard: TokenStandard.ERC1400,
  description: "A tokenized fund backed by high-grade corporate invoice receivables with 30-90 day payment terms",
  decimals: 18,
  initialSupply: "50000000",
  cap: "100000000",
  
  // Core ERC-1400 properties
  isMintable: true,
  isBurnable: true,
  isPausable: true,
  isIssuable: true,
  
  // Security token specific
  securityType: "debt",
  regulationType: "reg-d",
  issuingEntityName: "Chain Capital Receivables SPV LLC",
  issuingJurisdiction: "Delaware",
  issuingEntityLei: "5493000QVFGP2T1A7T23",
  
  // Compliance settings
  requireKyc: true,
  whitelistEnabled: true,
  investorAccreditation: true,
  autoCompliance: true,
  manualApprovals: false,
  complianceAutomationLevel: "fully-automated",
  complianceModule: "chain-capital-compliance-v2",
  
  // Restrictions
  holdingPeriod: "0",
  maxInvestorCount: "499",
  useGeographicRestrictions: true,
  defaultRestrictionPolicy: "reject",
  geographicRestrictions: ["CN", "IR", "KP", "SY"],
  
  // Token management
  forcedTransfers: true,
  forcedRedemptionEnabled: true,
  granularControl: true,
  recoveryMechanism: true,
  
  // Multi-class token
  isMultiClass: true,
  trancheTransferability: false,
  
  // Corporate features
  corporateActions: true,
  dividendDistribution: true,
  
  // Documentation
  documentManagement: true,
  documentUri: "https://ipfs.io/ipfs/QmXRZ8hGvFJK2kN3PvQq7L8M9wBxYzK1pV",
  documentHash: "0x8f9a2b4c6d8e1f3a5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a",
  legalTerms: "https://docs.chaincapital.com/receivables-fund/legal-terms",
  prospectus: "https://docs.chaincapital.com/receivables-fund/prospectus",
  
  // Enhanced features
  institutionalGrade: true,
  custodyIntegrationEnabled: true,
  primeBrokerageSupport: true,
  settlementIntegration: "DTC",
  clearingHouseIntegration: true,
  centralSecuritiesDepositoryIntegration: true,
  institutionalWalletSupport: true,
  
  // Monitoring and compliance
  realTimeComplianceMonitoring: true,
  automatedSanctionsScreening: true,
  pepScreeningEnabled: true,
  amlMonitoringEnabled: true,
  suspiciousActivityReporting: true,
  complianceOfficerNotifications: true,
  regulatoryReportingAutomation: true,
  
  // Reporting
  enhancedReportingEnabled: true,
  realTimeShareholderRegistry: true,
  beneficialOwnershipTracking: true,
  positionReconciliationEnabled: true,
  regulatoryFilingAutomation: true,
  auditTrailComprehensive: true,
  performanceAnalyticsEnabled: true,
  esgReportingEnabled: false,
  
  // Integration capabilities
  traditionalFinanceIntegration: true,
  swiftIntegrationEnabled: true,
  iso20022MessagingSupport: true,
  financialDataVendorIntegration: true,
  marketDataFeedsEnabled: true,
  crossChainBridgeSupport: false,
  layer2ScalingSupport: true,
  
  // Risk management
  advancedRiskManagement: true,
  positionLimitsEnabled: true,
  stressTestingEnabled: true,
  marginRequirementsDynamic: false,
  collateralManagementEnabled: true,
  insuranceCoverageEnabled: true,
  disasterRecoveryEnabled: true,
  
  // Custom features for receivables fund
  customFeatures: {
    receivablesType: "corporate-invoices",
    averageMaturity: "45-days",
    creditRatingMinimum: "BBB-",
    concentrationLimit: "5%",
    paymentTerms: "30-90 days",
    factorAdvanceRate: "85%",
    expectedYield: "8-12%",
    liquidityFeature: "daily-nav",
    underlying: {
      assetClass: "trade-receivables",
      geography: "US-UK-EU",
      currency: "USD",
      averageTicketSize: "150000"
    }
  },
  
  // Standard arrays with comprehensive test data
  standardArrays: {
    // Partitions representing different tranches
    partitions: [
      {
        name: "Senior Tranche",
        partitionId: "CIRF-A",
        amount: "40000000",
        transferable: true,
        metadata: {
          description: "Senior tranche with first priority on cash flows and lowest risk profile",
          riskLevel: "low",
          targetYield: "8.5%",
          subordination: "0%"
        }
      },
      {
        name: "Mezzanine Tranche",
        partitionId: "CIRF-B",
        amount: "7500000",
        transferable: true,
        metadata: {
          description: "Mezzanine tranche with moderate risk and higher expected returns",
          riskLevel: "medium",
          targetYield: "11.5%",
          subordination: "15%"
        }
      },
      {
        name: "Equity Tranche",
        partitionId: "CIRF-E",
        amount: "2500000",
        transferable: true,
        metadata: {
          description: "First-loss equity tranche providing credit enhancement",
          riskLevel: "high",
          targetYield: "15-20%",
          subordination: "95%"
        }
      }
    ],
    
    // Controllers with different roles and permissions
    controllers: [
      {
        address: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        name: "Fund Manager",
        permissions: ["issue", "redeem", "force-transfer", "partition-management"],
        isActive: true,
        canDelegate: false
      },
      {
        address: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        name: "Compliance Officer",
        permissions: ["whitelist-management", "sanctions-screening", "force-transfer"],
        isActive: true,
        canDelegate: false
      },
      {
        address: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        name: "Custody Provider",
        permissions: ["custody-operations", "settlement"],
        isActive: true,
        canDelegate: true
      }
    ],
    
    // Legal documents
    documents: [
      {
        name: "Private Placement Memorandum",
        documentUri: "https://ipfs.io/ipfs/QmPPM789xyz",
        documentType: "prospectus",
        documentHash: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b"
      },
      {
        name: "Subscription Agreement",
        documentUri: "https://ipfs.io/ipfs/QmSUB456def",
        documentType: "legal-agreement",
        documentHash: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c"
      },
      {
        name: "Fund Administration Agreement",
        documentUri: "https://ipfs.io/ipfs/QmFAA123ghi",
        documentType: "service-agreement",
        documentHash: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d"
      },
      {
        name: "Risk Management Framework",
        documentUri: "https://ipfs.io/ipfs/QmRMF789jkl",
        documentType: "risk-document",
        documentHash: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e"
      }
    ],
    
    // Corporate actions including dividends and capital events
    corporateActions: [
      {
        actionType: "dividend",
        announcementDate: "2024-06-15",
        recordDate: "2024-06-30",
        effectiveDate: "2024-07-01",
        paymentDate: "2024-07-15",
        actionDetails: {
          description: "Quarterly distribution from receivables collections",
          distributionRate: "2.125%",
          currency: "USD",
          paymentMethod: "automatic",
          eligiblePartitions: ["CIRF-A", "CIRF-B", "CIRF-E"]
        },
        impactOnSupply: null,
        impactOnPrice: null,
        shareholderApprovalRequired: false,
        votingDeadline: null,
        regulatoryApprovalRequired: false,
        status: "announced"
      },
      {
        actionType: "capital_call",
        announcementDate: "2024-09-01",
        recordDate: "2024-09-15",
        effectiveDate: "2024-10-01",
        actionDetails: {
          description: "Additional capital call for new receivables acquisition",
          callAmount: "5000000",
          currency: "USD",
          targetPartitions: ["CIRF-A", "CIRF-B"]
        },
        shareholderApprovalRequired: true,
        votingDeadline: "2024-09-30",
        regulatoryApprovalRequired: false,
        status: "pending"
      },
      {
        actionType: "redemption",
        announcementDate: "2024-12-01",
        recordDate: "2024-12-15",
        effectiveDate: "2024-12-31",
        actionDetails: {
          description: "Scheduled partial redemption of senior tranche",
          redemptionAmount: "10000000",
          redemptionPrice: "100.50",
          currency: "USD",
          affectedPartitions: ["CIRF-A"]
        },
        impactOnSupply: "-10000000",
        shareholderApprovalRequired: false,
        regulatoryApprovalRequired: true,
        status: "planned"
      }
    ],
    
    // Custody providers for institutional-grade custody
    custodyProviders: [
      {
        providerName: "State Street Digital",
        providerType: "institutional",
        providerAddress: "0x742d35Cc7c6C72B8E3D7D1a8b5BfE5c5aB3C8f9D",
        providerLei: "571474TGEMMWANVQHR86",
        custodyAgreementHash: "0xa1b2c3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef",
        isActive: true,
        certificationLevel: "tier1",
        jurisdiction: "US",
        regulatoryApprovals: ["SEC", "FINRA", "OCC"],
        integrationStatus: "active"
      },
      {
        providerName: "Northern Trust Digital Assets",
        providerType: "institutional",
        providerAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        providerLei: "6PTKHDJ8HDUF78PFQE15",
        custodyAgreementHash: "0xb2c3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef1",
        isActive: true,
        certificationLevel: "tier1",
        jurisdiction: "US",
        regulatoryApprovals: ["SEC", "FINRA", "FDIC"],
        integrationStatus: "active"
      },
      {
        providerName: "Fidelity Digital Assets",
        providerType: "institutional",
        providerAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        providerLei: "31570010000000000032",
        isActive: true,
        certificationLevel: "tier1",
        jurisdiction: "US",
        regulatoryApprovals: ["SEC", "FINRA"],
        integrationStatus: "pending"
      }
    ],
    
    // Regulatory filings for compliance
    regulatoryFilings: [
      {
        filingType: "form-d",
        filingDate: "2024-01-15",
        filingJurisdiction: "US",
        filingReference: "021-456789",
        documentHash: "0xf1e2d3c4b5a6987654321fedcba987654321fedcba987654321fedcba987654321",
        documentUri: "https://sec.gov/Archives/edgar/data/1234567/form-d-2024.pdf",
        regulatoryBody: "SEC",
        complianceStatus: "filed",
        dueDate: null,
        autoGenerated: false
      },
      {
        filingType: "quarterly-report",
        filingDate: "2024-04-15",
        filingJurisdiction: "US",
        filingReference: "Q1-2024-CIRF",
        documentHash: "0xe2d3c4b5a6987654321fedcba987654321fedcba987654321fedcba9876543212",
        documentUri: "https://docs.chaincapital.com/filings/q1-2024-report.pdf",
        regulatoryBody: "SEC",
        complianceStatus: "filed",
        autoGenerated: true
      },
      {
        filingType: "annual-report",
        filingDate: "2024-03-31",
        filingJurisdiction: "US",
        filingReference: "AR-2023-CIRF",
        regulatoryBody: "SEC",
        complianceStatus: "pending",
        dueDate: "2024-04-30",
        autoGenerated: false
      },
      {
        filingType: "material-change",
        filingDate: "2024-06-01",
        filingJurisdiction: "US",
        filingReference: "MC-2024-001",
        documentHash: "0xd3c4b5a6987654321fedcba987654321fedcba987654321fedcba98765432123",
        documentUri: "https://docs.chaincapital.com/filings/material-change-2024-001.pdf",
        regulatoryBody: "SEC",
        complianceStatus: "filed",
        autoGenerated: false
      }
    ],
    
    // Partition balances for different investors
    partitionBalances: [
      {
        partitionId: "CIRF-A",
        holderAddress: "0x742d35Cc7c6C72B8E3D1a8b5BfE5c5aB3C8f9D",
        balance: "15000000",
        metadata: {
          investorType: "institutional",
          onboardingDate: "2024-01-15",
          kycStatus: "approved",
          accreditationLevel: "qualified_institutional_buyer"
        }
      },
      {
        partitionId: "CIRF-A",
        holderAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        balance: "12000000",
        metadata: {
          investorType: "institutional",
          onboardingDate: "2024-02-01",
          kycStatus: "approved",
          accreditationLevel: "accredited_investor"
        }
      },
      {
        partitionId: "CIRF-A",
        holderAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        balance: "8000000",
        metadata: {
          investorType: "institutional",
          onboardingDate: "2024-02-15",
          kycStatus: "approved",
          accreditationLevel: "accredited_investor"
        }
      },
      {
        partitionId: "CIRF-B",
        holderAddress: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        balance: "4000000",
        metadata: {
          investorType: "sophisticated",
          onboardingDate: "2024-03-01",
          kycStatus: "approved",
          accreditationLevel: "sophisticated_investor"
        }
      },
      {
        partitionId: "CIRF-B",
        holderAddress: "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
        balance: "2500000",
        metadata: {
          investorType: "sophisticated",
          onboardingDate: "2024-03-15",
          kycStatus: "approved",
          accreditationLevel: "sophisticated_investor"
        }
      },
      {
        partitionId: "CIRF-E",
        holderAddress: "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
        balance: "1500000",
        metadata: {
          investorType: "founder",
          onboardingDate: "2024-01-01",
          kycStatus: "approved",
          accreditationLevel: "sponsor"
        }
      }
    ],
    
    // Partition operators for delegated management
    partitionOperators: [
      {
        partitionId: "CIRF-A",
        holderAddress: "0x742d35Cc7c6C72B8E3D1a8b5BfE5c5aB3C8f9D",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        authorized: true,
        metadata: {
          role: "portfolio_manager",
          permissions: ["transfer", "reporting"],
          delegationDate: "2024-01-15",
          expirationDate: "2025-01-15"
        }
      },
      {
        partitionId: "CIRF-A",
        holderAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        operatorAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        authorized: true,
        metadata: {
          role: "compliance_officer",
          permissions: ["compliance_monitoring", "reporting"],
          delegationDate: "2024-02-01",
          expirationDate: "2025-02-01"
        }
      },
      {
        partitionId: "CIRF-B",
        holderAddress: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        authorized: true,
        metadata: {
          role: "asset_manager",
          permissions: ["asset_allocation", "rebalancing"],
          delegationDate: "2024-03-01",
          expirationDate: "2025-03-01"
        }
      },
      {
        partitionId: "CIRF-E",
        holderAddress: "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        authorized: true,
        metadata: {
          role: "fund_administrator",
          permissions: ["full_admin", "emergency_powers"],
          delegationDate: "2024-01-01",
          expirationDate: "2026-01-01"
        }
      }
    ],
    
    // Partition transfers showing transaction history
    partitionTransfers: [
      {
        partitionId: "CIRF-A",
        fromAddress: "0x742d35Cc7c6C72B8E3D1a8b5BfE5c5aB3C8f9D",
        toAddress: "0x1a2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B",
        amount: "2000000",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        transactionHash: "0xa1b2c3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef",
        metadata: {
          transferType: "secondary_market",
          timestamp: "2024-03-15T14:30:00Z",
          transferPrice: "100.25",
          currency: "USD",
          settlementDate: "2024-03-17",
          fees: {
            transferFee: "1000",
            brokerageFee: "500",
            regulatoryFee: "100"
          },
          complianceChecks: {
            kycVerified: true,
            sanctionsScreened: true,
            accreditationConfirmed: true
          }
        }
      },
      {
        partitionId: "CIRF-B",
        fromAddress: "0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d",
        toAddress: "0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
        amount: "1000000",
        transactionHash: "0xb2c3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef1",
        metadata: {
          transferType: "private_placement",
          timestamp: "2024-04-20T10:15:00Z",
          transferPrice: "98.75",
          currency: "USD",
          settlementDate: "2024-04-22",
          fees: {
            transferFee: "500",
            placementFee: "2500"
          }
        }
      },
      {
        partitionId: "CIRF-A",
        fromAddress: "0x0000000000000000000000000000000000000000",
        toAddress: "0x3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
        amount: "5000000",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        transactionHash: "0xc3d4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef12",
        metadata: {
          transferType: "initial_issuance",
          timestamp: "2024-02-15T09:00:00Z",
          issuePrice: "100.00",
          currency: "USD",
          settlementDate: "2024-02-17",
          subscriptionAgreement: "SA-2024-003"
        }
      },
      {
        partitionId: "CIRF-E",
        fromAddress: "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
        toAddress: "0x0000000000000000000000000000000000000000",
        amount: "500000",
        operatorAddress: "0x8a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        transactionHash: "0xd4e5f6789abcdef123456789abcdef123456789abcdef123456789abcdef123",
        metadata: {
          transferType: "redemption",
          timestamp: "2024-05-30T16:45:00Z",
          redemptionPrice: "105.50",
          currency: "USD",
          settlementDate: "2024-06-01",
          redemptionReason: "maturity",
          netAmount: "527500"
        }
      }
    ]
  },
  
  config_mode: "max",
  blocks: {
    name: "Corporate Invoice Receivables Fund",
    symbol: "CIRF",
    initial_supply: "50000000",
    cap: "100000000",
    is_mintable: true,
    is_burnable: true,
    is_pausable: true,
    is_issuable: true,
    security_type: "debt",
    regulation_type: "reg-d",
    issuing_entity_name: "Chain Capital Receivables SPV LLC",
    issuing_jurisdiction: "Delaware",
    issuing_entity_lei: "5493000QVFGP2T1A7T23",
    require_kyc: true,
    whitelist_enabled: true,
    investor_accreditation: true,
    auto_compliance: true,
    manual_approvals: false
  }
};

/**
 * Minimal ERC-1400 example for basic testing
 */
export const erc1400MinimalExample = {
  name: "Basic Security Token",
  symbol: "BST",
  standard: TokenStandard.ERC1400,
  description: "A minimal ERC-1400 security token for testing basic functionality",
  decimals: 18,
  initialSupply: "1000000",
  securityType: "equity",
  isIssuable: true,
  
  standardArrays: {
    partitions: [
      {
        name: "Common Stock",
        partitionId: "COMMON",
        amount: "1000000",
        transferable: true
      }
    ],
    controllers: [
      "0x1234567890123456789012345678901234567890"
    ],
    documents: [
      {
        name: "Minimal Legal Document",
        documentUri: "https://example.com/minimal-doc.pdf",
        documentType: "legal-agreement"
      }
    ]
  },
  
  config_mode: "min",
  blocks: {
    name: "Basic Security Token",
    symbol: "BST",
    initial_supply: "1000000",
    security_type: "equity",
    is_issuable: true
  }
};

/**
 * Test data validation function
 */
export function validateERC1400TestData(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!data.name) errors.push("Missing required field: name");
  if (!data.symbol) errors.push("Missing required field: symbol");
  if (!data.standard) errors.push("Missing required field: standard");
  if (!data.securityType) errors.push("Missing required field: securityType");
  
  // Check standard arrays
  if (!data.standardArrays) {
    errors.push("Missing standardArrays object");
  } else {
    if (!data.standardArrays.partitions || !Array.isArray(data.standardArrays.partitions)) {
      errors.push("Missing or invalid standardArrays.partitions array");
    }
    if (!data.standardArrays.controllers || !Array.isArray(data.standardArrays.controllers)) {
      errors.push("Missing or invalid standardArrays.controllers array");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Test utility functions for ERC-1400 data manipulation
 */
export const erc1400TestUtils = {
  /**
   * Generate test partition data
   */
  generateTestPartitions: (count: number = 3) => {
    const partitions = [];
    for (let i = 1; i <= count; i++) {
      partitions.push({
        name: `Test Partition ${i}`,
        partitionId: `TEST-${i}`,
        amount: (1000000 * i).toString(),
        transferable: i % 2 === 1 // Alternate transferability
      });
    }
    return partitions;
  },
  
  /**
   * Generate test controller addresses
   */
  generateTestControllers: (count: number = 2) => {
    const controllers = [];
    for (let i = 1; i <= count; i++) {
      controllers.push(`0x${i.toString().padStart(40, '0')}`);
    }
    return controllers;
  },
  
  /**
   * Generate test document data
   */
  generateTestDocuments: (count: number = 2) => {
    const documents = [];
    const types = ["prospectus", "legal-agreement", "risk-document", "service-agreement"];
    for (let i = 1; i <= count; i++) {
      documents.push({
        name: `Test Document ${i}`,
        documentUri: `https://example.com/test-doc-${i}.pdf`,
        documentType: types[(i - 1) % types.length],
        documentHash: `0x${i.toString(16).padStart(64, '0')}`
      });
    }
    return documents;
  }
};
