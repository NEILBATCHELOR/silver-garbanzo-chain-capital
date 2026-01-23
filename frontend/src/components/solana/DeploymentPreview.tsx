/**
 * Deployment Preview Component
 * Shows a summary of all configuration before deployment
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { SolanaTokenType } from './TokenTypeSelector';
import type { BasicTokenConfig } from './BasicTokenConfigForm';
import type { Token2022Extension } from './ExtensionsSelector';
import type { TransferFeeConfiguration } from './TransferFeeConfig';

interface DeploymentPreviewProps {
  tokenType: SolanaTokenType;
  basicConfig: BasicTokenConfig;
  extensions: Token2022Extension[];
  transferFeeConfig: TransferFeeConfiguration | null;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
}

export function DeploymentPreview({
  tokenType,
  basicConfig,
  extensions,
  transferFeeConfig,
  network
}: DeploymentPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Deployment</CardTitle>
        <CardDescription>
          Please review your token configuration before deployment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Token Type */}
        <div>
          <h3 className="font-semibold mb-2">Token Type</h3>
          <div className="flex items-center gap-2">
            <Badge variant={tokenType === 'Token2022' ? 'default' : 'secondary'}>
              {tokenType === 'SPL' ? 'SPL Token (Standard)' : 'Token-2022 (Advanced)'}
            </Badge>
            <Badge variant="outline">{network}</Badge>
          </div>
        </div>

        <Separator />

        {/* Basic Information */}
        <div className="space-y-3">
          <h3 className="font-semibold">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{basicConfig.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Symbol</p>
              <p className="font-medium">{basicConfig.symbol}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Decimals</p>
              <p className="font-medium">{basicConfig.decimals}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Initial Supply</p>
              <p className="font-medium">{basicConfig.initialSupply.toLocaleString()}</p>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Metadata URI</p>
            <p className="font-medium text-sm truncate">{basicConfig.metadataUri}</p>
          </div>
        </div>

        {/* Extensions (Token-2022 only) */}
        {tokenType === 'Token2022' && extensions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Enabled Extensions</h3>
              <div className="flex flex-wrap gap-2">
                {extensions.map(ext => (
                  <Badge key={ext} variant="outline">
                    {ext}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Transfer Fee Config */}
        {tokenType === 'Token2022' && transferFeeConfig && extensions.includes('TransferFee') && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Transfer Fee Configuration</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Fee Percentage</p>
                  <p className="font-medium">{(transferFeeConfig.feeBasisPoints / 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Maximum Fee</p>
                  <p className="font-medium">{transferFeeConfig.maxFee} lamports</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Estimated Cost */}
        <Separator />
        <div className="space-y-3">
          <h3 className="font-semibold">Estimated Cost</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network Fees</span>
              <span className="font-medium">
                ~{tokenType === 'SPL' ? '0.0015' : '0.0025'} SOL
              </span>
            </div>
            {tokenType === 'Token2022' && extensions.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Extension Overhead</span>
                <span className="font-medium">+{extensions.length * 0.0005} SOL</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-semibold">Total Estimated</span>
              <span className="font-semibold">
                ~{tokenType === 'SPL' 
                  ? '0.0015' 
                  : (0.0025 + extensions.length * 0.0005).toFixed(4)} SOL
              </span>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {tokenType === 'Token2022' && extensions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="font-semibold text-amber-600">⚠️ Important Warnings</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Extensions are permanent and cannot be removed after deployment</li>
                <li>Transfer fees will apply to ALL transfers, including your own</li>
                <li>Carefully verify all configuration before proceeding</li>
                {network !== 'devnet' && (
                  <li className="text-amber-600 font-medium">
                    You are deploying to {network}. Ensure you have tested on devnet first!
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
