import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TokensIcon } from "@radix-ui/react-icons";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import base forms from max config
import { ERC721BaseForm, ERC721PropertiesForm } from '../max/ERC721Config';

/**
 * ERC721SimpleConfig - Minimal ERC-721 NFT configuration interface
 * 
 * Simplified form system for creating basic ERC-721 NFT collections with:
 * 
 * 📋 **Core Information** (ERC721BaseForm)
 * - Collection name, symbol, description
 * - Basic configuration settings
 * 
 * ⚙️ **Essential Properties** (ERC721PropertiesForm - limited sections)
 * - Metadata management (base_uri, metadata_storage)
 * - Basic supply settings (max_supply, minting controls)
 * - Simple royalty configuration (if enabled)
 * 
 * Focuses on essential features needed to deploy a functional NFT collection
 * without the complexity of advanced features like mint phases, traits, etc.
 */

interface ERC721SimpleConfigProps {
  tokenForm?: any;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setTokenForm?: (updater: any) => void;
  onConfigChange?: (config: any) => void;
  initialConfig?: any;
}

const ERC721SimpleConfig: React.FC<ERC721SimpleConfigProps> = ({ 
  tokenForm = {},
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {}
}) => {
  const [config, setConfig] = useState(() => ({
    // Ensure standard is set for NFTs
    standard: 'ERC-721',
    decimals: 0,
    config_mode: 'min',
    
    // Initialize with provided values
    ...initialConfig,
    ...tokenForm,
    
    // NFT-specific defaults
    metadata_storage: tokenForm.metadata_storage || initialConfig.metadataStorage || 'ipfs',
    is_mintable: tokenForm.is_mintable ?? initialConfig.isMintable ?? true,
    has_royalty: tokenForm.has_royalty ?? initialConfig.hasRoyalty ?? false,
    asset_type: tokenForm.asset_type || 'unique_asset',
    enumerable: tokenForm.enumerable ?? true,
    use_safe_transfer: tokenForm.use_safe_transfer ?? true,
    
    // Map legacy field names for compatibility
    baseUri: tokenForm.base_uri || initialConfig.baseUri || '',
    metadataStorage: tokenForm.metadata_storage || initialConfig.metadataStorage || 'ipfs',
    maxSupply: tokenForm.max_supply || initialConfig.maxSupply || '',
    isMintable: tokenForm.is_mintable ?? initialConfig.isMintable ?? true,
    hasRoyalty: tokenForm.has_royalty ?? initialConfig.hasRoyalty ?? false,
    royaltyPercentage: tokenForm.royalty_percentage || initialConfig.royaltyPercentage || '',
    royaltyReceiver: tokenForm.royalty_receiver || initialConfig.royaltyReceiver || ''
  }));

  // Update parent when config changes
  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(config);
    }
    
    if (setTokenForm) {
      setTokenForm((prev: any) => ({ ...prev, ...config }));
    }
  }, [config, onConfigChange, setTokenForm]);

  const handleInputChange_Internal = (field: string, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    
    // Also call legacy handler if provided
    if (handleInputChange && typeof handleInputChange === 'function') {
      const syntheticEvent = {
        target: { name: field, value }
      } as React.ChangeEvent<HTMLInputElement>;
      handleInputChange(syntheticEvent);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center">
              <TokensIcon className="h-6 w-6 mr-2" />
              ERC-721 NFT Collection Configuration
              <Badge variant="outline" className="ml-2">
                SIMPLE Mode
              </Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Create a basic NFT collection with essential features. For advanced features like mint phases, 
              rarity systems, and complex trading mechanics, switch to MAX mode.
            </div>
          </CardHeader>
        </Card>

        {/* Core Information */}
        <ERC721BaseForm
          tokenForm={config}
          onInputChange={handleInputChange_Internal}
        />

        {/* Essential Properties */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Essential NFT Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Configure the core properties needed for your NFT collection.
            </div>
            
            {/* We'll show a simplified version with only essential accordion items */}
            <ERC721PropertiesForm
              tokenForm={config}
              onInputChange={handleInputChange_Internal}
            />
          </CardContent>
        </Card>

        {/* Simple Configuration Summary */}
        {config.name && config.symbol && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Ready to Deploy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium">Collection</div>
                  <div className="text-xs text-muted-foreground">
                    {config.name} ({config.symbol})
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Type</div>
                  <div className="text-xs text-muted-foreground">
                    ERC-721 NFT Collection
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Supply</div>
                  <div className="text-xs text-muted-foreground">
                    {config.maxSupply || config.max_supply || 'Unlimited'}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Royalties</div>
                  <div className="text-xs text-muted-foreground">
                    {config.hasRoyalty || config.has_royalty 
                      ? `${config.royaltyPercentage || config.royalty_percentage || '0'}%` 
                      : 'Disabled'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-green-50 rounded-md">
                <div className="text-sm font-medium text-green-900">
                  ✅ Your NFT collection is configured and ready to deploy!
                </div>
                <div className="text-xs text-green-700 mt-1">
                  This configuration includes all essential features for a functional NFT collection.
                  You can always upgrade to advanced features later.
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ERC721SimpleConfig;
