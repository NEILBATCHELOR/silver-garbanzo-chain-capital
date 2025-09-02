import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield,
  Building,
  FileText,
  Users
} from 'lucide-react';

interface ERC1400CardSectionProps {
  token: any;
  isExpanded: boolean;
  isLoading?: boolean;
}

const ERC1400CardSection: React.FC<ERC1400CardSectionProps> = ({
  token,
  isExpanded,
  isLoading = false
}) => {
  const properties = token.erc1400Properties || {};
  const blocks = token.blocks || {};
  
  const securityType = properties.securityType || blocks.security_type || 'Equity';
  const issuingJurisdiction = properties.issuingJurisdiction || blocks.issuing_jurisdiction;
  const requireKyc = properties.requireKyc || blocks.require_kyc;
  const controllersCount = token.erc1400Controllers?.length || 0;
  const documentsCount = token.erc1400Documents?.length || 0;

  if (!isExpanded) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-sm font-medium">{securityType} Security</span>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {requireKyc && (
            <Badge variant="outline" className="text-xs bg-red-50">
              KYC Required
            </Badge>
          )}
          {controllersCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {controllersCount} Controllers
            </Badge>
          )}
          {documentsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              {documentsCount} Documents
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-500" />
            Security Token Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Security Type</p>
            <p className="text-base font-medium">{securityType}</p>
          </div>
          
          {issuingJurisdiction && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Jurisdiction</p>
              <p className="text-base font-medium">{issuingJurisdiction}</p>
            </div>
          )}
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">KYC Required</p>
            <Badge variant={requireKyc ? "destructive" : "secondary"}>
              {requireKyc ? 'Required' : 'Not Required'}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Controllers</p>
            <p className="text-base font-medium">{controllersCount}</p>
          </div>
        </CardContent>
      </Card>

      {token.erc1400Documents && token.erc1400Documents.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              Legal Documents ({token.erc1400Documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {token.erc1400Documents.slice(0, 2).map((doc: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 border rounded">
                  <span className="font-medium truncate">{doc.name}</span>
                  <Badge variant="outline">{doc.documentType}</Badge>
                </div>
              ))}
              {token.erc1400Documents.length > 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{token.erc1400Documents.length - 2} more documents
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ERC1400CardSection;
