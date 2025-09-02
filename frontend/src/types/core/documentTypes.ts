/**
 * Document Types Extension
 * 
 * Temporary fix for document type enum mismatches until database migration
 * is applied and Supabase types are regenerated.
 * 
 * This file provides union types that combine existing database enums with
 * individual document types used in the upload components.
 */

import type { DocumentType as DatabaseDocumentType } from './database';

// Individual document types that will be added to the database enum
export type IndividualDocumentType = 
  // Identity Documents
  | 'passport'
  | 'drivers_license'
  | 'national_id'
  | 'state_id'
  | 'voter_id'
  
  // Address Verification
  | 'proof_of_address'
  | 'utility_bill'
  | 'bank_statement'
  | 'lease_agreement'
  | 'mortgage_statement'
  | 'phone_bill'
  | 'internet_bill'
  | 'insurance_statement'
  
  // Financial Documents
  | 'investment_agreement'
  | 'accreditation_letter'
  | 'tax_document'
  | 'w2_form'
  | 'tax_return'
  | 'income_statement'
  | 'employment_letter'
  | 'pay_stub'
  | 'financial_statement'
  
  // Legal Documents
  | 'power_of_attorney'
  | 'trust_document'
  | 'beneficial_ownership'
  | 'source_of_funds'
  | 'source_of_wealth'
  
  // Additional Corporate Documents for Individual Use Cases
  | 'articles_of_incorporation'
  | 'bylaws'
  | 'operating_agreement'
  | 'certificate_of_good_standing'
  | 'tax_exemption_letter'
  | 'audit_report'
  | 'board_resolution'
  | 'legal_opinion'
  | 'prospectus'
  | 'offering_memorandum'
  | 'regulatory_filing'
  | 'compliance_certificate'
  
  // Generic
  | 'other';

// Combined document type that includes both database enum and individual types
export type ExtendedDocumentType = DatabaseDocumentType | IndividualDocumentType;

// Export for use in upload components
export type UploadDocumentType = ExtendedDocumentType;

// Type guards
export function isDatabaseDocumentType(type: string): type is DatabaseDocumentType {
  const databaseTypes = [
    'commercial_register',
    'certificate_incorporation',
    'memorandum_articles',
    'director_list',
    'shareholder_register',
    'financial_statements',
    'regulatory_status',
    'qualification_summary',
    'business_description',
    'organizational_chart',
    'key_people_cv',
    'aml_kyc_description'
  ];
  return databaseTypes.includes(type);
}

export function isIndividualDocumentType(type: string): type is IndividualDocumentType {
  const individualTypes: IndividualDocumentType[] = [
    'passport',
    'drivers_license',
    'national_id',
    'state_id',
    'voter_id',
    'proof_of_address',
    'utility_bill',
    'bank_statement',
    'lease_agreement',
    'mortgage_statement',
    'phone_bill',
    'internet_bill',
    'insurance_statement',
    'investment_agreement',
    'accreditation_letter',
    'tax_document',
    'w2_form',
    'tax_return',
    'income_statement',
    'employment_letter',
    'pay_stub',
    'financial_statement',
    'power_of_attorney',
    'trust_document',
    'beneficial_ownership',
    'source_of_funds',
    'source_of_wealth',
    'articles_of_incorporation',
    'bylaws',
    'operating_agreement',
    'certificate_of_good_standing',
    'tax_exemption_letter',
    'audit_report',
    'board_resolution',
    'legal_opinion',
    'prospectus',
    'offering_memorandum',
    'regulatory_filing',
    'compliance_certificate',
    'other'
  ];
  return individualTypes.includes(type as IndividualDocumentType);
}

// Document type mapping for different entity types
export const DocumentTypesByEntity = {
  investor: [
    'passport',
    'drivers_license',
    'national_id',
    'proof_of_address',
    'bank_statement',
    'investment_agreement',
    'accreditation_letter',
    'tax_document',
    'other'
  ] as const,
  
  issuer: [
    'articles_of_incorporation',
    'bylaws',
    'operating_agreement',
    'certificate_of_good_standing',
    'tax_exemption_letter',
    'financial_statements',
    'audit_report',
    'board_resolution',
    'power_of_attorney',
    'legal_opinion',
    'prospectus',
    'offering_memorandum',
    'regulatory_filing',
    'compliance_certificate',
    'other'
  ] as const,
  
  organization: [
    'commercial_register',
    'certificate_incorporation',
    'memorandum_articles',
    'director_list',
    'shareholder_register',
    'financial_statements',
    'regulatory_status',
    'qualification_summary',
    'business_description',
    'organizational_chart',
    'key_people_cv',
    'aml_kyc_description',
    'other'
  ] as const
} as const;

export type InvestorDocumentType = typeof DocumentTypesByEntity.investor[number];
export type IssuerDocumentType = typeof DocumentTypesByEntity.issuer[number];
export type OrganizationDocumentType = typeof DocumentTypesByEntity.organization[number];
