// Export all document components
export { default as DocumentReview } from './DocumentReview';
export { default as DocumentUploader } from './DocumentUploader';
export { default as DocumentVerification } from './DocumentVerification';
export { default as SmartDocumentProcessor } from './SmartDocumentProcessor';

// Export issuer document components
export { default as IssuerDocumentUpload } from './IssuerDocumentUpload';
export { default as IssuerDocumentList } from './IssuerDocumentList';
export { default as SimplifiedDocumentManagement } from './SimplifiedDocumentManagement';

// Alias corrected components to existing ones
export { default as CorrectedIssuerDocumentUpload } from './IssuerDocumentUpload';
export { default as CorrectedIssuerDocumentList } from './IssuerDocumentList';

// Export pre-configured issuer upload components
export {
  CertificateIncorporationUpload,
  MemorandumArticlesUpload,
  CompanyRegisterUpload,
  RegulatoryStatusUpload,
  BusinessLicensesUpload,
  DirectorListUpload,
  ShareholderRegisterUpload,
  FinancialStatementsUpload,
  DirectorIdUpload,
  DirectorProofAddressUpload,
  QualificationSummaryUpload,
  BusinessDescriptionUpload,
  OrganizationalChartUpload,
  KeyPeopleCvUpload,
  AmlKycDescriptionUpload,
  IssuerDocumentType
} from './IssuerDocumentUpload';

// Export corrected issuer upload components (aliases to existing components)
export {
  CompanyRegisterUpload as CommercialRegisterUpload,
  CertificateIncorporationUpload as CorrectedCertificateIncorporationUpload,
  MemorandumArticlesUpload as CorrectedMemorandumArticlesUpload,
  DirectorListUpload as CorrectedDirectorListUpload,
  ShareholderRegisterUpload as CorrectedShareholderRegisterUpload,
  FinancialStatementsUpload as CorrectedFinancialStatementsUpload,
  RegulatoryStatusUpload as CorrectedRegulatoryStatusUpload,
  BusinessLicensesUpload as CorrectedBusinessLicensesUpload,
  DirectorIdUpload as CorrectedDirectorIdUpload,
  DirectorProofAddressUpload as CorrectedDirectorProofAddressUpload,
  IssuerDocumentType as CorrectedIssuerDocumentType
} from './IssuerDocumentUpload';

// Export new investor document components
export { default as InvestorDocumentUpload } from './InvestorDocumentUpload';
export { default as InvestorDocumentList } from './InvestorDocumentList';

// Export pre-configured investor upload components
export {
  PassportUpload,
  DriversLicenseUpload,
  NationalIdUpload,
  UtilityBillUpload,
  BankStatementUpload,
  ProofOfIncomeUpload,
  AccreditationCertificateUpload,
  SelfieWithIdUpload,
  SourceOfWealthUpload,
  CorporateRegistrationUpload,
  InvestorDocumentType
} from './InvestorDocumentUpload';

// Re-export for convenience
export { IssuerDocumentType as ValidIssuerDocumentType } from './IssuerDocumentUpload';
