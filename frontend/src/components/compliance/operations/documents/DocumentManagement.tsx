import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Building, 
  Users, 
  Shield, 
  CreditCard, 
  DollarSign,
  Eye,
  CheckSquare,
  Clock,
  AlertTriangle
} from 'lucide-react';

// Import the new document components
import {
  IssuerDocumentUpload,
  IssuerDocumentList,
  IssuerDocumentType,
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
  
  InvestorDocumentUpload,
  InvestorDocumentList,
  InvestorDocumentType,
  PassportUpload,
  DriversLicenseUpload,
  NationalIdUpload,
  UtilityBillUpload,
  BankStatementUpload,
  ProofOfIncomeUpload,
  AccreditationCertificateUpload,
  SelfieWithIdUpload,
  SourceOfWealthUpload,
  CorporateRegistrationUpload
} from './components';

interface DocumentManagementProps {
  mode: 'issuer' | 'investor';
  entityId: string;
  entityName?: string;
  compact?: boolean;
  embedded?: boolean;
  isRegulated?: boolean; // For issuers
  investorType?: 'individual' | 'corporate' | 'trust'; // For investors
}

const DocumentManagement: React.FC<DocumentManagementProps> = ({
  mode,
  entityId,
  entityName,
  compact = false,
  embedded = false,
  isRegulated = true,
  investorType = 'individual'
}) => {
  const [activeTab, setActiveTab] = useState('essential');

  // Issuer document categories following projects pattern
  const issuerDocumentCategories = [
    {
      id: 'essential',
      label: 'Essential Documents',
      icon: <FileText className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.CERTIFICATE_INCORPORATION,
        IssuerDocumentType.MEMORANDUM_ARTICLES,
        IssuerDocumentType.COMPANY_REGISTER
      ],
      description: 'Core company registration and incorporation documents'
    },
    {
      id: 'regulatory',
      label: 'Regulatory & Licensing',
      icon: <Shield className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.REGULATORY_STATUS,
        IssuerDocumentType.BUSINESS_LICENSES
      ],
      description: 'Licenses and regulatory compliance documents'
    },
    {
      id: 'governance',
      label: 'Corporate Governance',
      icon: <Building className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.DIRECTOR_LIST,
        IssuerDocumentType.SHAREHOLDER_REGISTER
      ],
      description: 'Management and ownership documentation'
    },
    {
      id: 'financial',
      label: 'Financial Documents',
      icon: <DollarSign className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.FINANCIAL_STATEMENTS,
        IssuerDocumentType.AUDIT_REPORT
      ],
      description: 'Financial statements and audit reports'
    },
    {
      id: 'identification',
      label: 'ID & Verification',
      icon: <CreditCard className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.DIRECTOR_ID,
        IssuerDocumentType.DIRECTOR_PROOF_ADDRESS,
        IssuerDocumentType.SHAREHOLDER_ID
      ],
      description: 'Personal identification for key individuals'
    }
  ];

  // Add additional category for unregulated issuers
  if (!isRegulated) {
    issuerDocumentCategories.push({
      id: 'additional',
      label: 'Additional Requirements',
      icon: <FileText className="h-4 w-4 mr-2" />,
      types: [
        IssuerDocumentType.QUALIFICATION_SUMMARY,
        IssuerDocumentType.BUSINESS_DESCRIPTION,
        IssuerDocumentType.ORGANIZATIONAL_CHART,
        IssuerDocumentType.KEY_PEOPLE_CV,
        IssuerDocumentType.AML_KYC_DESCRIPTION
      ],
      description: 'Additional documents for unregulated entities'
    });
  }

  // Investor document categories
  const investorDocumentCategories = [
    {
      id: 'identity',
      label: 'Identity Verification',
      icon: <CreditCard className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.PASSPORT,
        InvestorDocumentType.DRIVERS_LICENSE,
        InvestorDocumentType.NATIONAL_ID,
        InvestorDocumentType.SELFIE_WITH_ID
      ],
      description: 'Government-issued identification documents'
    },
    {
      id: 'address',
      label: 'Proof of Address',
      icon: <FileText className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.UTILITY_BILL,
        InvestorDocumentType.BANK_STATEMENT,
        InvestorDocumentType.COUNCIL_TAX,
        InvestorDocumentType.LEASE_AGREEMENT
      ],
      description: 'Recent address verification documents'
    },
    {
      id: 'financial',
      label: 'Financial Verification',
      icon: <DollarSign className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.PROOF_OF_INCOME,
        InvestorDocumentType.TAX_RETURN,
        InvestorDocumentType.BANK_REFERENCE,
        InvestorDocumentType.INVESTMENT_STATEMENT
      ],
      description: 'Income and financial status verification'
    },
    {
      id: 'accreditation',
      label: 'Investor Accreditation',
      icon: <CheckSquare className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.ACCREDITATION_CERTIFICATE,
        InvestorDocumentType.QUALIFIED_INVESTOR_CERTIFICATE,
        InvestorDocumentType.PROFESSIONAL_CERTIFICATE
      ],
      description: 'Accredited or qualified investor certification'
    }
  ];

  // Add corporate-specific documents for corporate investors
  if (investorType === 'corporate') {
    investorDocumentCategories.push({
      id: 'corporate',
      label: 'Corporate Documents',
      icon: <Building className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.CORPORATE_REGISTRATION,
        InvestorDocumentType.ARTICLES_OF_INCORPORATION,
        InvestorDocumentType.BOARD_RESOLUTION,
        InvestorDocumentType.AUTHORIZED_SIGNATORY_LIST
      ],
      description: 'Corporate registration and authorization documents'
    });
  }

  // Add trust-specific documents for trust investors
  if (investorType === 'trust') {
    investorDocumentCategories.push({
      id: 'trust',
      label: 'Trust Documents',
      icon: <Shield className="h-4 w-4 mr-2" />,
      types: [
        InvestorDocumentType.TRUST_DEED,
        InvestorDocumentType.TRUSTEE_APPOINTMENT,
        InvestorDocumentType.BENEFICIARY_DETAILS
      ],
      description: 'Trust documentation and beneficiary information'
    });
  }

  const documentCategories = mode === 'issuer' ? issuerDocumentCategories : investorDocumentCategories;

  // Get upload component for document type
  const getUploadComponent = (type: string) => {
    const commonProps = {
      onDocumentUploaded: () => {
        // Force refresh of document list
        const event = new CustomEvent('document-uploaded');
        window.dispatchEvent(event);
      },
      buttonSize: (compact ? 'sm' : 'default') as "sm" | "default" | "lg",
      buttonVariant: 'outline' as const
    };

    if (mode === 'issuer') {
      const issuerProps = {
        ...commonProps,
        issuerId: entityId
      };

      switch (type) {
        case IssuerDocumentType.CERTIFICATE_INCORPORATION:
          return <CertificateIncorporationUpload {...issuerProps} />;
        case IssuerDocumentType.MEMORANDUM_ARTICLES:
          return <MemorandumArticlesUpload {...issuerProps} />;
        case IssuerDocumentType.COMPANY_REGISTER:
          return <CompanyRegisterUpload {...issuerProps} />;
        case IssuerDocumentType.REGULATORY_STATUS:
          return <RegulatoryStatusUpload {...issuerProps} />;
        case IssuerDocumentType.BUSINESS_LICENSES:
          return <BusinessLicensesUpload {...issuerProps} />;
        case IssuerDocumentType.DIRECTOR_LIST:
          return <DirectorListUpload {...issuerProps} />;
        case IssuerDocumentType.SHAREHOLDER_REGISTER:
          return <ShareholderRegisterUpload {...issuerProps} />;
        case IssuerDocumentType.FINANCIAL_STATEMENTS:
          return <FinancialStatementsUpload {...issuerProps} />;
        case IssuerDocumentType.DIRECTOR_ID:
          return <DirectorIdUpload {...issuerProps} />;
        case IssuerDocumentType.DIRECTOR_PROOF_ADDRESS:
          return <DirectorProofAddressUpload {...issuerProps} />;
        default:
          return <IssuerDocumentUpload {...issuerProps} documentType={type as IssuerDocumentType} />;
      }
    } else {
      const investorProps = {
        ...commonProps,
        investorId: entityId
      };

      switch (type) {
        case InvestorDocumentType.PASSPORT:
          return <PassportUpload {...investorProps} />;
        case InvestorDocumentType.DRIVERS_LICENSE:
          return <DriversLicenseUpload {...investorProps} />;
        case InvestorDocumentType.NATIONAL_ID:
          return <NationalIdUpload {...investorProps} />;
        case InvestorDocumentType.UTILITY_BILL:
          return <UtilityBillUpload {...investorProps} />;
        case InvestorDocumentType.BANK_STATEMENT:
          return <BankStatementUpload {...investorProps} />;
        case InvestorDocumentType.PROOF_OF_INCOME:
          return <ProofOfIncomeUpload {...investorProps} />;
        case InvestorDocumentType.ACCREDITATION_CERTIFICATE:
          return <AccreditationCertificateUpload {...investorProps} />;
        case InvestorDocumentType.SELFIE_WITH_ID:
          return <SelfieWithIdUpload {...investorProps} />;
        case InvestorDocumentType.SOURCE_OF_WEALTH:
          return <SourceOfWealthUpload {...investorProps} />;
        case InvestorDocumentType.CORPORATE_REGISTRATION:
          return <CorporateRegistrationUpload {...investorProps} />;
        default:
          return <InvestorDocumentUpload {...investorProps} documentType={type as InvestorDocumentType} />;
      }
    }
  };

  // Get icon for document type
  const getDocumentTypeIcon = (type: string) => {
    if (mode === 'issuer') {
      switch (type) {
        case IssuerDocumentType.CERTIFICATE_INCORPORATION:
        case IssuerDocumentType.MEMORANDUM_ARTICLES:
        case IssuerDocumentType.COMPANY_REGISTER:
          return <Building className="h-4 w-4 mr-2" />;
        case IssuerDocumentType.REGULATORY_STATUS:
        case IssuerDocumentType.BUSINESS_LICENSES:
          return <Shield className="h-4 w-4 mr-2" />;
        case IssuerDocumentType.FINANCIAL_STATEMENTS:
        case IssuerDocumentType.AUDIT_REPORT:
          return <DollarSign className="h-4 w-4 mr-2" />;
        case IssuerDocumentType.DIRECTOR_ID:
        case IssuerDocumentType.DIRECTOR_PROOF_ADDRESS:
        case IssuerDocumentType.SHAREHOLDER_ID:
          return <CreditCard className="h-4 w-4 mr-2" />;
        default:
          return <FileText className="h-4 w-4 mr-2" />;
      }
    } else {
      switch (type) {
        case InvestorDocumentType.PASSPORT:
        case InvestorDocumentType.DRIVERS_LICENSE:
        case InvestorDocumentType.NATIONAL_ID:
        case InvestorDocumentType.SELFIE_WITH_ID:
          return <CreditCard className="h-4 w-4 mr-2" />;
        case InvestorDocumentType.PROOF_OF_INCOME:
        case InvestorDocumentType.TAX_RETURN:
        case InvestorDocumentType.BANK_STATEMENT:
          return <DollarSign className="h-4 w-4 mr-2" />;
        case InvestorDocumentType.ACCREDITATION_CERTIFICATE:
        case InvestorDocumentType.QUALIFIED_INVESTOR_CERTIFICATE:
          return <CheckSquare className="h-4 w-4 mr-2" />;
        default:
          return <FileText className="h-4 w-4 mr-2" />;
      }
    }
  };

  // Format document type label
  const formatDocumentTypeLabel = (type: string) => {
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get document type description
  const getDocumentTypeDescription = (type: string): string => {
    if (mode === 'issuer') {
      switch (type) {
        case IssuerDocumentType.CERTIFICATE_INCORPORATION:
          return 'Official company registration document';
        case IssuerDocumentType.MEMORANDUM_ARTICLES:
          return 'Company constitution and rules';
        case IssuerDocumentType.COMPANY_REGISTER:
          return 'Recent extract from commercial register (must be less than 3 months old)';
        case IssuerDocumentType.REGULATORY_STATUS:
          return 'Proof of regulatory status or exemption';
        case IssuerDocumentType.BUSINESS_LICENSES:
          return 'All relevant business licenses and permits';
        case IssuerDocumentType.DIRECTOR_LIST:
          return 'Current board of directors';
        case IssuerDocumentType.SHAREHOLDER_REGISTER:
          return 'Current shareholders with >10% ownership';
        case IssuerDocumentType.FINANCIAL_STATEMENTS:
          return 'Latest audited financial statements (must be less than 12 months old)';
        case IssuerDocumentType.DIRECTOR_ID:
          return 'Passport copies for all directors';
        case IssuerDocumentType.DIRECTOR_PROOF_ADDRESS:
          return 'Recent utility bills or bank statements (must be less than 3 months old)';
        default:
          return 'Company documentation';
      }
    } else {
      switch (type) {
        case InvestorDocumentType.PASSPORT:
          return 'Clear photo of passport (all pages with information)';
        case InvestorDocumentType.DRIVERS_LICENSE:
          return 'Front and back of driver\'s license';
        case InvestorDocumentType.NATIONAL_ID:
          return 'Front and back of national ID card';
        case InvestorDocumentType.UTILITY_BILL:
          return 'Recent utility bill (gas, electric, water) less than 3 months old';
        case InvestorDocumentType.BANK_STATEMENT:
          return 'Recent bank statement less than 3 months old';
        case InvestorDocumentType.PROOF_OF_INCOME:
          return 'Salary slips, employment letter, or other proof of income';
        case InvestorDocumentType.ACCREDITATION_CERTIFICATE:
          return 'Accredited investor certification';
        case InvestorDocumentType.SELFIE_WITH_ID:
          return 'Selfie holding your ID document for verification';
        case InvestorDocumentType.SOURCE_OF_WEALTH:
          return 'Documentation explaining the source of your investment funds';
        case InvestorDocumentType.CORPORATE_REGISTRATION:
          return 'Company registration certificate and incorporation documents';
        default:
          return 'Investor documentation';
      }
    }
  };

  const title = mode === 'issuer' 
    ? `Issuer Document Management${entityName ? ` - ${entityName}` : ''}`
    : `Investor Document Management${entityName ? ` - ${entityName}` : ''}`;

  if (embedded) {
    // Embedded view for use in compliance workflows (like projects pattern)
    return (
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
            <TabsList className="md:w-auto h-auto flex-wrap">
              {documentCategories.map(category => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center gap-1"
                >
                  {category.icon}
                  <span>{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          {documentCategories.map(category => (
            <TabsContent key={category.id} value={category.id} className="mt-4">
              <div className="grid grid-cols-1 gap-6">
                <div className="border-l-4 border-primary/20 pl-3 mb-4">
                  <h3 className="text-base font-medium">{category.label}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                {category.types.map(docType => (
                  <Card key={docType} className="overflow-hidden">
                    <CardHeader className="bg-muted/30 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getDocumentTypeIcon(docType)}
                          <CardTitle className="text-base">
                            {formatDocumentTypeLabel(docType)}
                          </CardTitle>
                        </div>
                        <div>
                          {getUploadComponent(docType)}
                        </div>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {getDocumentTypeDescription(docType)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {mode === 'issuer' ? (
                        <IssuerDocumentList
                          issuerId={entityId}
                          key={`${docType}-${entityId}`}
                          preFilteredType={docType as IssuerDocumentType}
                          compact={true}
                        />
                      ) : (
                        <InvestorDocumentList
                          investorId={entityId}
                          key={`${docType}-${entityId}`}
                          preFilteredType={docType as InvestorDocumentType}
                          compact={true}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  // Standalone view
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            Manage documents for {mode === 'issuer' ? 'issuer compliance' : 'investor onboarding'} and verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 lg:grid-cols-6">
              {documentCategories.map(category => (
                <TabsTrigger key={category.id} value={category.id} className="flex items-center gap-1 text-xs">
                  {category.icon}
                  <span className="hidden sm:inline">{category.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            
            {documentCategories.map(category => (
              <TabsContent key={category.id} value={category.id}>
                <div className="space-y-6">
                  <div className="border-l-4 border-primary/20 pl-3">
                    <h3 className="text-lg font-semibold">{category.label}</h3>
                    <p className="text-muted-foreground">{category.description}</p>
                  </div>
                  
                  {mode === 'issuer' ? (
                    <IssuerDocumentList
                      issuerId={entityId}
                      compact={false}
                    />
                  ) : (
                    <InvestorDocumentList
                      investorId={entityId}
                      compact={false}
                    />
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentManagement;
