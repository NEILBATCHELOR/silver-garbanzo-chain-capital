import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Building, 
  Users, 
  Upload,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

// Import the document components
import IssuerDocumentUpload, {
  CompanyRegisterUpload as CommercialRegisterUpload,
  CertificateIncorporationUpload,
  MemorandumArticlesUpload,
  DirectorListUpload,
  ShareholderRegisterUpload,
  FinancialStatementsUpload,
  RegulatoryStatusUpload,
  QualificationSummaryUpload,
  BusinessDescriptionUpload,
  OrganizationalChartUpload,
  KeyPeopleCvUpload,
  AmlKycDescriptionUpload,
  IssuerDocumentType
} from './IssuerDocumentUpload';

import IssuerDocumentList from './IssuerDocumentList';

// Import investor components
import {
  InvestorDocumentUpload,
  InvestorDocumentList,
  InvestorDocumentType,
  CorrectedIssuerDocumentUpload,
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
} from './index';

interface SimplifiedDocumentManagementProps {
  mode: 'issuer' | 'investor';
  entityId: string;
  entityName?: string;
  compact?: boolean;
  embedded?: boolean;
  isRegulated?: boolean; // For issuers
  investorType?: 'individual' | 'corporate' | 'trust'; // For investors
}

const SimplifiedDocumentManagement: React.FC<SimplifiedDocumentManagementProps> = ({
  mode,
  entityId,
  entityName,
  compact = false,
  embedded = false,
  isRegulated = true,
  investorType = 'individual'
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDocumentUploaded = () => {
    // Force refresh of document lists
    setRefreshKey(prev => prev + 1);
    
    // Dispatch global event
    const event = new CustomEvent('document-uploaded');
    window.dispatchEvent(event);
  };

  // Issuer document categories organized by importance and frequency
  const issuerDocumentCategories = [
    {
      title: 'Core Company Documents',
      description: 'Essential registration and incorporation documents',
      icon: <Building className="h-5 w-5 text-blue-600" />,
      required: true,
      documents: [
        {
          type: IssuerDocumentType.CERTIFICATE_INCORPORATION,
          component: <CertificateIncorporationUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Official company registration document'
        },
        {
          type: IssuerDocumentType.MEMORANDUM_ARTICLES,
          component: <MemorandumArticlesUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Company constitution and rules'
        },
        {
          type: IssuerDocumentType.COMMERCIAL_REGISTER,
          component: <CommercialRegisterUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Recent commercial register extract (less than 3 months old)'
        }
      ]
    },
    {
      title: 'Corporate Structure & Governance',
      description: 'Management and ownership documentation',
      icon: <Users className="h-5 w-5 text-green-600" />,
      required: true,
      documents: [
        {
          type: IssuerDocumentType.DIRECTOR_LIST,
          component: <DirectorListUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Current board of directors'
        },
        {
          type: IssuerDocumentType.SHAREHOLDER_REGISTER,
          component: <ShareholderRegisterUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Current shareholders with >10% ownership'
        }
      ]
    },
    {
      title: 'Financial & Regulatory',
      description: 'Financial statements and regulatory compliance',
      icon: <FileText className="h-5 w-5 text-purple-600" />,
      required: true,
      documents: [
        {
          type: IssuerDocumentType.FINANCIAL_STATEMENTS,
          component: <FinancialStatementsUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Latest audited financial statements (less than 12 months old)'
        },
        {
          type: IssuerDocumentType.REGULATORY_STATUS,
          component: <RegulatoryStatusUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Proof of regulatory status or exemption'
        }
      ]
    }
  ];

  // Additional documents for unregulated entities
  if (!isRegulated) {
    issuerDocumentCategories.push({
      title: 'Additional Requirements',
      description: 'Additional documents for unregulated entities',
      icon: <AlertCircle className="h-5 w-5 text-orange-600" />,
      required: false,
      documents: [
        {
          type: IssuerDocumentType.QUALIFICATION_SUMMARY,
          component: <QualificationSummaryUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Summary of key personnel qualifications'
        },
        {
          type: IssuerDocumentType.BUSINESS_DESCRIPTION,
          component: <BusinessDescriptionUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Detailed business description'
        },
        {
          type: IssuerDocumentType.ORGANIZATIONAL_CHART,
          component: <OrganizationalChartUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Company organizational structure'
        },
        {
          type: IssuerDocumentType.KEY_PEOPLE_CV,
          component: <KeyPeopleCvUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'CVs of key management personnel'
        },
        {
          type: IssuerDocumentType.AML_KYC_DESCRIPTION,
          component: <AmlKycDescriptionUpload 
            issuerId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'AML/KYC processes and procedures'
        }
      ]
    });
  }

  // Investor document categories (simplified from original)
  const investorDocumentCategories = [
    {
      title: 'Identity Verification',
      description: 'Government-issued identification documents',
      icon: <Users className="h-5 w-5 text-blue-600" />,
      required: true,
      documents: [
        {
          type: InvestorDocumentType.PASSPORT,
          component: <PassportUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Clear photo of passport (all pages with information)'
        },
        {
          type: InvestorDocumentType.DRIVERS_LICENSE,
          component: <DriversLicenseUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Front and back of driver\'s license'
        },
        {
          type: InvestorDocumentType.NATIONAL_ID,
          component: <NationalIdUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Front and back of national ID card'
        }
      ]
    },
    {
      title: 'Address & Financial Verification',
      description: 'Recent address and financial status verification',
      icon: <FileText className="h-5 w-5 text-green-600" />,
      required: true,
      documents: [
        {
          type: InvestorDocumentType.UTILITY_BILL,
          component: <UtilityBillUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Recent utility bill (less than 3 months old)'
        },
        {
          type: InvestorDocumentType.BANK_STATEMENT,
          component: <BankStatementUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Recent bank statement (less than 3 months old)'
        },
        {
          type: InvestorDocumentType.PROOF_OF_INCOME,
          component: <ProofOfIncomeUpload 
            investorId={entityId} 
            onDocumentUploaded={handleDocumentUploaded} 
            buttonSize={compact ? 'sm' : 'default'} 
          />,
          description: 'Salary slips, employment letter, or other proof of income'
        }
      ]
    }
  ];

  const documentCategories = mode === 'issuer' ? issuerDocumentCategories : investorDocumentCategories;

  const formatDocumentTypeLabel = (type: string) => {
    return type.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const title = mode === 'issuer' 
    ? `Document Upload${entityName ? ` - ${entityName}` : ''}`
    : `Document Upload${entityName ? ` - ${entityName}` : ''}`;

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">
            Upload the required documents for {mode === 'issuer' ? 'issuer compliance' : 'investor verification'}
          </p>
        </div>
      )}

      {documentCategories.map((category, categoryIndex) => (
        <Card key={categoryIndex} className="overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              {category.icon}
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {category.title}
                  {category.required && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {category.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <div className="grid gap-6">
              {category.documents.map((doc, docIndex) => (
                <div key={docIndex} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {formatDocumentTypeLabel(doc.type)}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.component}
                    </div>
                  </div>
                  
                  {/* Document List for this specific type */}
                  <div className="pl-6 border-l-2 border-muted">
                    {mode === 'issuer' ? (
                      <IssuerDocumentList
                        key={`${doc.type}-${entityId}-${refreshKey}`}
                        issuerId={entityId}
                        preFilteredType={doc.type as IssuerDocumentType}
                        compact={true}
                      />
                    ) : (
                      <InvestorDocumentList
                        key={`${doc.type}-${entityId}-${refreshKey}`}
                        investorId={entityId}
                        preFilteredType={doc.type as InvestorDocumentType}
                        compact={true}
                      />
                    )}
                  </div>
                  
                  {docIndex < category.documents.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* General Upload for Any Document Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Other Documents
          </CardTitle>
          <CardDescription>
            Upload any additional documents that don't fit the specific categories above
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            {mode === 'issuer' ? (
              <CorrectedIssuerDocumentUpload
                issuerId={entityId}
                onDocumentUploaded={handleDocumentUploaded}
                title="Upload Other Document"
                description="Upload any additional document for this issuer"
                buttonSize={compact ? 'sm' : 'default'}
              />
            ) : (
              <InvestorDocumentUpload
                investorId={entityId}
                onDocumentUploaded={handleDocumentUploaded}
                title="Upload Other Document"
                description="Upload any additional document for this investor"
                buttonSize={compact ? 'sm' : 'default'}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifiedDocumentManagement;
