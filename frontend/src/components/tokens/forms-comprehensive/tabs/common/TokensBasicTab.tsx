// Tokens Basic Tab Component
// Handles the main tokens table with 25 core fields

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';

import { TokenStandard } from '@/types/core/centralModels';
import { TokensTableData, ConfigMode } from '../../types';

interface TokensBasicTabProps {
  data: TokensTableData | TokensTableData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const TokensBasicTab: React.FC<TokensBasicTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting
}) => {
  // Ensure we're working with a single record for the tokens table
  const tokenData: TokensTableData = Array.isArray(data) 
    ? (data[0] || {} as TokensTableData) 
    : (data || {} as TokensTableData);

  const handleFieldChange = (field: string, value: any) => {
    onFieldChange(field, value, 0);
  };

  const getFieldError = (field: string): string[] => {
    return validationErrors[`0.${field}`] || validationErrors[field] || [];
  };

  const hasFieldError = (field: string): boolean => {
    return getFieldError(field).length > 0;
  };

  return (
    <div className="space-y-8">
      {/* Core Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Core Information
            <Badge variant="outline">Required</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Token Name *
                </Label>
                <Input
                  id="name"
                  value={tokenData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="Enter token name"
                  className={hasFieldError('name') ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {hasFieldError('name') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('name').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Token Symbol */}
              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-sm font-medium">
                  Token Symbol *
                </Label>
                <Input
                  id="symbol"
                  value={tokenData.symbol || ''}
                  onChange={(e) => handleFieldChange('symbol', e.target.value.toUpperCase())}
                  placeholder="e.g., ETH, BTC"
                  className={hasFieldError('symbol') ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {hasFieldError('symbol') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('symbol').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Decimals */}
              <div className="space-y-2">
                <Label htmlFor="decimals" className="text-sm font-medium">
                  Decimals *
                </Label>
                <Select
                  value={tokenData.decimals?.toString() || '18'}
                  onValueChange={(value) => handleFieldChange('decimals', parseInt(value))}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={hasFieldError('decimals') ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select decimals" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 6, 8, 9, 12, 15, 18].map((decimal) => (
                      <SelectItem key={decimal} value={decimal.toString()}>
                        {decimal} {decimal === 18 ? '(Standard)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasFieldError('decimals') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('decimals').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Token Standard */}
              <div className="space-y-2">
                <Label htmlFor="standard" className="text-sm font-medium">
                  Token Standard *
                </Label>
                <Select
                  value={tokenData.standard || ''}
                  onValueChange={(value) => handleFieldChange('standard', value as TokenStandard)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className={hasFieldError('standard') ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TokenStandard.ERC20}>ERC-20 (Fungible)</SelectItem>
                    <SelectItem value={TokenStandard.ERC721}>ERC-721 (NFT)</SelectItem>
                    <SelectItem value={TokenStandard.ERC1155}>ERC-1155 (Multi-Token)</SelectItem>
                    <SelectItem value={TokenStandard.ERC1400}>ERC-1400 (Security Token)</SelectItem>
                    <SelectItem value={TokenStandard.ERC3525}>ERC-3525 (Semi-Fungible)</SelectItem>
                    <SelectItem value={TokenStandard.ERC4626}>ERC-4626 (Vault Token)</SelectItem>
                  </SelectContent>
                </Select>
                {hasFieldError('standard') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('standard').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={tokenData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Describe your token's purpose and features"
                rows={3}
                className={hasFieldError('description') ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {hasFieldError('description') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('description').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration (Max Mode) */}
      {configMode === 'max' && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Supply */}
                <div className="space-y-2">
                  <Label htmlFor="total_supply" className="text-sm font-medium">
                    Total Supply
                  </Label>
                  <Input
                    id="total_supply"
                    value={tokenData.total_supply || ''}
                    onChange={(e) => handleFieldChange('total_supply', e.target.value)}
                    placeholder="Enter total supply"
                    className={hasFieldError('total_supply') ? 'border-red-500' : ''}
                    disabled={isSubmitting}
                  />
                  {hasFieldError('total_supply') && (
                    <Alert variant="destructive" className="py-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {getFieldError('total_supply').join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Config Mode */}
                <div className="space-y-2">
                  <Label htmlFor="config_mode" className="text-sm font-medium">
                    Configuration Mode
                  </Label>
                  <Select
                    value={tokenData.config_mode || 'min'}
                    onValueChange={(value) => handleFieldChange('config_mode', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="min">Basic (Min)</SelectItem>
                      <SelectItem value="max">Advanced (Max)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={tokenData.status || 'DRAFT'}
                    onValueChange={(value) => handleFieldChange('status', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="UNDER REVIEW">Under Review</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="READY TO MINT">Ready to Mint</SelectItem>
                      <SelectItem value="MINTED">Minted</SelectItem>
                      <SelectItem value="DEPLOYED">Deployed</SelectItem>
                      <SelectItem value="DISTRIBUTED">Distributed</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="PAUSED">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Blockchain */}
                <div className="space-y-2">
                  <Label htmlFor="blockchain" className="text-sm font-medium">
                    Target Blockchain
                  </Label>
                  <Select
                    value={tokenData.blockchain || ''}
                    onValueChange={(value) => handleFieldChange('blockchain', value)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select blockchain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="polygon">Polygon</SelectItem>
                      <SelectItem value="bsc">Binance Smart Chain</SelectItem>
                      <SelectItem value="arbitrum">Arbitrum</SelectItem>
                      <SelectItem value="optimism">Optimism</SelectItem>
                      <SelectItem value="avalanche">Avalanche</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment Information (Max Mode) */}
      {configMode === 'max' && (
        <Card>
          <CardHeader>
            <CardTitle>Deployment Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contract Address */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">
                    Contract Address
                  </Label>
                  <Input
                    id="address"
                    value={tokenData.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="0x..."
                    disabled={isSubmitting}
                    readOnly
                  />
                </div>

                {/* Deployment Status */}
                <div className="space-y-2">
                  <Label htmlFor="deployment_status" className="text-sm font-medium">
                    Deployment Status
                  </Label>
                  <Input
                    id="deployment_status"
                    value={tokenData.deployment_status || 'pending'}
                    disabled
                    readOnly
                  />
                </div>

                {/* Transaction Hash */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="deployment_transaction" className="text-sm font-medium">
                    Deployment Transaction
                  </Label>
                  <Input
                    id="deployment_transaction"
                    value={tokenData.deployment_transaction || ''}
                    disabled
                    readOnly
                    placeholder="Will be populated after deployment"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">Saved</Badge>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          {tokenData.updated_at && `Last updated: ${new Date(tokenData.updated_at).toLocaleString()}`}
        </div>
      </div>
    </div>
  );
};

export default TokensBasicTab;
