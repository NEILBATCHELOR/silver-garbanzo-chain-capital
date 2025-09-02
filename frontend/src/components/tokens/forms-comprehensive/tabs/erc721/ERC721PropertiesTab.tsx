// ERC721 Properties Tab Component
// Handles token_erc721_properties table with NFT-specific configuration

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

import { TokenERC721PropertiesData, ConfigMode } from '../../types';

interface ERC721PropertiesTabProps {
  data: TokenERC721PropertiesData | TokenERC721PropertiesData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const ERC721PropertiesTab: React.FC<ERC721PropertiesTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting
}) => {
  const propertiesData = Array.isArray(data) ? (data[0] || {}) : data;

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
    <div className="space-y-6">
      {/* Metadata Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Base URI */}
            <div className="space-y-2">
              <Label htmlFor="base_uri" className="text-sm font-medium">
                Base URI
              </Label>
              <Input
                id="base_uri"
                value={propertiesData.base_uri || ''}
                onChange={(e) => handleFieldChange('base_uri', e.target.value)}
                placeholder="https://api.example.com/metadata/"
                className={hasFieldError('base_uri') ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Base URL for token metadata. Token ID will be appended to this URL.
              </p>
              {hasFieldError('base_uri') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('base_uri').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Metadata Storage */}
            <div className="space-y-2">
              <Label htmlFor="metadata_storage" className="text-sm font-medium">
                Metadata Storage
              </Label>
              <Select
                value={propertiesData.metadata_storage || ''}
                onValueChange={(value) => handleFieldChange('metadata_storage', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className={hasFieldError('metadata_storage') ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select storage type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipfs">IPFS</SelectItem>
                  <SelectItem value="arweave">Arweave</SelectItem>
                  <SelectItem value="centralized">Centralized Server</SelectItem>
                  <SelectItem value="on_chain">On-Chain</SelectItem>
                  <SelectItem value="mixed">Mixed Storage</SelectItem>
                </SelectContent>
              </Select>
              {hasFieldError('metadata_storage') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('metadata_storage').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Supply */}
            <div className="space-y-2">
              <Label htmlFor="max_supply" className="text-sm font-medium">
                Maximum Supply
              </Label>
              <Input
                id="max_supply"
                value={propertiesData.max_supply || ''}
                onChange={(e) => handleFieldChange('max_supply', e.target.value)}
                placeholder="Enter max supply (0 for unlimited)"
                className={hasFieldError('max_supply') ? 'border-red-500' : ''}
                disabled={isSubmitting}
              />
              {hasFieldError('max_supply') && (
                <Alert variant="destructive" className="py-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {getFieldError('max_supply').join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Asset Type */}
            <div className="space-y-2">
              <Label htmlFor="asset_type" className="text-sm font-medium">
                Asset Type
              </Label>
              <Select
                value={propertiesData.asset_type || ''}
                onValueChange={(value) => handleFieldChange('asset_type', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="art">Digital Art</SelectItem>
                  <SelectItem value="collectible">Collectible</SelectItem>
                  <SelectItem value="gaming">Gaming Asset</SelectItem>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="photography">Photography</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="domain">Domain Name</SelectItem>
                  <SelectItem value="utility">Utility NFT</SelectItem>
                  <SelectItem value="membership">Membership</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Minting Method */}
            <div className="space-y-2">
              <Label htmlFor="minting_method" className="text-sm font-medium">
                Minting Method
              </Label>
              <Select
                value={propertiesData.minting_method || ''}
                onValueChange={(value) => handleFieldChange('minting_method', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select minting method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sequential">Sequential (1, 2, 3...)</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                  <SelectItem value="pre_reveal">Pre-Reveal</SelectItem>
                  <SelectItem value="on_demand">On-Demand</SelectItem>
                  <SelectItem value="batch">Batch Minting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* URI Storage */}
            <div className="space-y-2">
              <Label htmlFor="uri_storage" className="text-sm font-medium">
                URI Storage Pattern
              </Label>
              <Select
                value={propertiesData.uri_storage || ''}
                onValueChange={(value) => handleFieldChange('uri_storage', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select URI pattern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="base_plus_id">Base URI + Token ID</SelectItem>
                  <SelectItem value="individual">Individual URI per Token</SelectItem>
                  <SelectItem value="folder_structure">Folder Structure</SelectItem>
                  <SelectItem value="hash_based">Hash-Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Features */}
      <Card>
        <CardHeader>
          <CardTitle>Token Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Auto Increment IDs */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="auto_increment_ids" className="text-sm font-medium">
                  Auto Increment IDs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically assign sequential token IDs
                </p>
              </div>
              <Switch
                id="auto_increment_ids"
                checked={propertiesData.auto_increment_ids || false}
                onCheckedChange={(checked) => handleFieldChange('auto_increment_ids', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Updatable URIs */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="updatable_uris" className="text-sm font-medium">
                  Updatable URIs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow updating token metadata URIs
                </p>
              </div>
              <Switch
                id="updatable_uris"
                checked={propertiesData.updatable_uris || false}
                onCheckedChange={(checked) => handleFieldChange('updatable_uris', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Mintable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_mintable" className="text-sm font-medium">
                  Mintable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow minting new tokens
                </p>
              </div>
              <Switch
                id="is_mintable"
                checked={propertiesData.is_mintable || false}
                onCheckedChange={(checked) => handleFieldChange('is_mintable', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Burnable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_burnable" className="text-sm font-medium">
                  Burnable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow burning (destroying) tokens
                </p>
              </div>
              <Switch
                id="is_burnable"
                checked={propertiesData.is_burnable || false}
                onCheckedChange={(checked) => handleFieldChange('is_burnable', checked)}
                disabled={isSubmitting}
              />
            </div>

            {/* Pausable */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-1">
                <Label htmlFor="is_pausable" className="text-sm font-medium">
                  Pausable
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow pausing all transfers
                </p>
              </div>
              <Switch
                id="is_pausable"
                checked={propertiesData.is_pausable || false}
                onCheckedChange={(checked) => handleFieldChange('is_pausable', checked)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Royalty Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Royalty Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Has Royalty */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="has_royalty" className="text-sm font-medium">
                Enable Royalties
              </Label>
              <p className="text-xs text-muted-foreground">
                Collect royalties on secondary sales
              </p>
            </div>
            <Switch
              id="has_royalty"
              checked={propertiesData.has_royalty || false}
              onCheckedChange={(checked) => handleFieldChange('has_royalty', checked)}
              disabled={isSubmitting}
            />
          </div>

          {/* Royalty Details */}
          {propertiesData.has_royalty && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="royalty_percentage" className="text-sm font-medium">
                  Royalty Percentage (%)
                </Label>
                <Input
                  id="royalty_percentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={propertiesData.royalty_percentage || 0}
                  onChange={(e) => handleFieldChange('royalty_percentage', parseFloat(e.target.value))}
                  className={hasFieldError('royalty_percentage') ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {hasFieldError('royalty_percentage') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('royalty_percentage').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="royalty_receiver" className="text-sm font-medium">
                  Royalty Receiver Address
                </Label>
                <Input
                  id="royalty_receiver"
                  value={propertiesData.royalty_receiver || ''}
                  onChange={(e) => handleFieldChange('royalty_receiver', e.target.value)}
                  placeholder="0x..."
                  className={hasFieldError('royalty_receiver') ? 'border-red-500' : ''}
                  disabled={isSubmitting}
                />
                {hasFieldError('royalty_receiver') && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {getFieldError('royalty_receiver').join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-721 Properties:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onValidate}
          disabled={isSubmitting}
        >
          Validate
        </Button>
      </div>
    </div>
  );
};

export default ERC721PropertiesTab;
