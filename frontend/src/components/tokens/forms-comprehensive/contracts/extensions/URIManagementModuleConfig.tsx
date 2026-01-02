/**
 * URI Management Module Configuration Component
 * ✅ ENHANCED: Complete metadata URI management with per-token overrides
 * Advanced metadata URI management for ERC1155
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, Trash2, Link as LinkIcon, Code } from 'lucide-react';
import type { ModuleConfigProps, UriManagementModuleConfig } from '../types';

export function URIManagementModuleConfigPanel({
  config,
  onChange,
  disabled = false,
  errors
}: ModuleConfigProps<UriManagementModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      onChange({
        ...config,
        enabled: false
      });
    } else {
      onChange({
        ...config,
        enabled: true,
        baseURI: config.baseURI || '',
        ipfsGateway: config.ipfsGateway || 'https://ipfs.io/ipfs/',
        useTokenIdSubstitution: config.useTokenIdSubstitution !== false, // Default true
        perTokenUris: config.perTokenUris || [],
        dynamicUris: config.dynamicUris || false,
        updateableUris: config.updateableUris || false
      });
    }
  };

  const addPerTokenUri = () => {
    const newPerTokenUris = [
      ...(config.perTokenUris || []),
      {
        tokenId: '',
        uri: ''
      }
    ];
    onChange({
      ...config,
      perTokenUris: newPerTokenUris
    });
  };

  const removePerTokenUri = (index: number) => {
    const newPerTokenUris = [...(config.perTokenUris || [])];
    newPerTokenUris.splice(index, 1);
    onChange({
      ...config,
      perTokenUris: newPerTokenUris
    });
  };

  const updatePerTokenUri = (index: number, field: 'tokenId' | 'uri', value: string) => {
    const newPerTokenUris = [...(config.perTokenUris || [])];
    newPerTokenUris[index] = {
      ...newPerTokenUris[index],
      [field]: value
    };
    onChange({
      ...config,
      perTokenUris: newPerTokenUris
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">URI Management Module</Label>
          <p className="text-xs text-muted-foreground">
            Advanced metadata URI management with per-token overrides and dynamic URIs
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Advanced metadata URI management with per-token overrides and dynamic URIs. 
              Enables centralized URI updates and flexible metadata systems.
            </AlertDescription>
          </Alert>

          {/* Base URI */}
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-sm flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Base URI Configuration
              </Label>
              
              <div className="space-y-2">
                <Label className="text-xs">Base URI</Label>
                <Input
                  value={config.baseURI}
                  onChange={(e) => onChange({
                    ...config,
                    baseURI: e.target.value
                  })}
                  placeholder="https://api.example.com/metadata/"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Base URI for all token metadata. Used as default for tokens without custom URIs.
                </p>
                {errors?.['baseURI'] && (
                  <p className="text-xs text-destructive">{errors['baseURI']}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs">IPFS Gateway URL</Label>
                <Input
                  value={config.ipfsGateway || ''}
                  onChange={(e) => onChange({
                    ...config,
                    ipfsGateway: e.target.value
                  })}
                  placeholder="https://ipfs.io/ipfs/"
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  Gateway URL for IPFS content. Examples: https://ipfs.io/ipfs/, https://gateway.pinata.cloud/ipfs/
                </p>
                {errors?.['ipfsGateway'] && (
                  <p className="text-xs text-destructive">{errors['ipfsGateway']}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useTokenIdSubstitution"
                  checked={config.useTokenIdSubstitution !== false}
                  onChange={(e) => onChange({
                    ...config,
                    useTokenIdSubstitution: e.target.checked
                  })}
                  disabled={disabled}
                  className="h-4 w-4"
                />
                <Label htmlFor="useTokenIdSubstitution" className="text-xs font-normal cursor-pointer flex items-center gap-2">
                  <Code className="h-3 w-3" />
                  Use Token ID Substitution
                </Label>
              </div>
              <p className="text-xs text-muted-foreground pl-6">
                Replace <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{'"{id}"'}</code> in URI with token ID
                (e.g., <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{config.baseURI || 'https://api.example.com/'}{'1.json'}</code>)
              </p>
            </div>
          </Card>

          {/* URI Behavior Options */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-3">
              <Label className="text-sm">URI Behavior</Label>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dynamicUris"
                      checked={config.dynamicUris || false}
                      onChange={(e) => onChange({
                        ...config,
                        dynamicUris: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="dynamicUris" className="text-xs font-normal cursor-pointer">
                      Enable Dynamic URIs
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    URIs can be computed dynamically on-chain based on token state
                  </p>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="updateableUris"
                      checked={config.updateableUris || false}
                      onChange={(e) => onChange({
                        ...config,
                        updateableUris: e.target.checked
                      })}
                      disabled={disabled}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="updateableUris" className="text-xs font-normal cursor-pointer">
                      Allow URI Updates
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6 mt-1">
                    Admin can update base URI and per-token URIs after deployment
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Per-Token URIs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Per-Token URI Overrides</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPerTokenUri}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Token URI
              </Button>
            </div>

            {(!config.perTokenUris || config.perTokenUris.length === 0) && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No per-token URI overrides configured. All tokens will use the base URI. 
                  Click "Add Token URI" to set custom URIs for specific tokens.
                </AlertDescription>
              </Alert>
            )}

            {config.perTokenUris && config.perTokenUris.map((tokenUri, index) => (
              <Card key={index} className="p-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-medium">Token URI Override {index + 1}</h5>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePerTokenUri(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Token ID *</Label>
                      <Input
                        value={tokenUri.tokenId}
                        onChange={(e) => updatePerTokenUri(index, 'tokenId', e.target.value)}
                        disabled={disabled}
                        placeholder="1"
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Custom URI *</Label>
                      <Input
                        value={tokenUri.uri}
                        onChange={(e) => updatePerTokenUri(index, 'uri', e.target.value)}
                        disabled={disabled}
                        placeholder="https://custom.uri/token/1.json"
                        className="text-sm font-mono"
                      />
                    </div>
                  </div>

                  {tokenUri.tokenId && tokenUri.uri && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Token <strong>#{tokenUri.tokenId}</strong> will use custom URI: 
                        <code className="text-[10px] bg-muted px-1 py-0.5 rounded ml-1">{tokenUri.uri}</code>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* URI Example */}
          <Card className="p-4 bg-primary/10">
            <div className="space-y-2">
              <Label className="text-sm font-medium">URI Resolution Example</Label>
              <div className="space-y-1 text-xs">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-20">Base URI:</span>
                  <code className="bg-muted px-2 py-1 rounded flex-1 break-all">
                    {config.baseURI || 'https://api.example.com/metadata/'}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-20">Token #1:</span>
                  <code className="bg-muted px-2 py-1 rounded flex-1 break-all">
                    {config.perTokenUris?.find(u => u.tokenId === '1')?.uri || 
                     `${config.baseURI || 'https://api.example.com/metadata/'}${config.useTokenIdSubstitution !== false ? '1' : '{id}'}`}
                  </code>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground min-w-20">Token #2:</span>
                  <code className="bg-muted px-2 py-1 rounded flex-1 break-all">
                    {config.perTokenUris?.find(u => u.tokenId === '2')?.uri || 
                     `${config.baseURI || 'https://api.example.com/metadata/'}${config.useTokenIdSubstitution !== false ? '2' : '{id}'}`}
                  </code>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary */}
          {config.perTokenUris && config.perTokenUris.length > 0 && (
            <div className="flex items-center justify-between text-sm p-3 bg-primary/10 rounded-lg">
              <span className="text-muted-foreground">
                Custom URI Overrides
              </span>
              <span className="font-semibold">
                {config.perTokenUris.length} {config.perTokenUris.length === 1 ? 'token' : 'tokens'}
              </span>
            </div>
          )}

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Pre-deployment configuration:</strong> Base URI and per-token URI overrides 
              will be configured automatically during deployment. 
              {config.updateableUris && ' URI updates will be allowed post-deployment.'}
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
