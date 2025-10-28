/**
 * Copy Actions Toolbar Component
 * Provides advanced copy functionality for spread matrix
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  ChevronRight,
  ChevronDown,
  CheckSquare,
  Square,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SpreadMatrixRow, CopySpreadParams } from '@/hooks/psp';

interface CopyActionsToolbarProps {
  matrix: SpreadMatrixRow[];
  onCopy: (params: CopySpreadParams) => Promise<boolean>;
  disabled?: boolean;
}

type CopyMode = 'row' | 'column' | 'cell';

export function CopyActionsToolbar({
  matrix,
  onCopy,
  disabled = false,
}: CopyActionsToolbarProps) {
  const [copyMode, setCopyMode] = useState<CopyMode>('row');
  const [sourceAsset, setSourceAsset] = useState<string>('');
  const [sourceTier, setSourceTier] = useState<string>('');
  const [targetAssets, setTargetAssets] = useState<Set<string>>(new Set());
  const [targetTiers, setTargetTiers] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique assets and tiers from matrix
  const assets = matrix.map(row => row.cryptoAsset);
  const tiers = matrix.length > 0
    ? Object.keys(matrix[0].tiers).sort((a, b) => {
        const aTier = matrix[0].tiers[a];
        const bTier = matrix[0].tiers[b];
        return aTier.tierMin - bTier.tierMin;
      })
    : [];

  const handleCopy = async () => {
    setError(null);
    setCopying(true);

    try {
      if (copyMode === 'row') {
        if (!sourceAsset) {
          setError('Please select a source asset');
          return;
        }
        if (targetAssets.size === 0) {
          setError('Please select at least one target asset');
          return;
        }

        await onCopy({
          projectId: '', // Will be filled by parent
          direction: 'row',
          source: { cryptoAsset: sourceAsset },
          targets: Array.from(targetAssets).map(asset => ({ cryptoAsset: asset })),
        });
      } else if (copyMode === 'column') {
        if (!sourceTier) {
          setError('Please select a source tier');
          return;
        }
        if (targetTiers.size === 0) {
          setError('Please select at least one target tier');
          return;
        }

        await onCopy({
          projectId: '', // Will be filled by parent
          direction: 'column',
          source: { tierName: sourceTier },
          targets: Array.from(targetTiers).map(tier => ({ tierName: tier })),
        });
      }

      // Clear selections after successful copy
      setTargetAssets(new Set());
      setTargetTiers(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Copy operation failed');
    } finally {
      setCopying(false);
    }
  };

  const toggleTargetAsset = (asset: string) => {
    const newTargets = new Set(targetAssets);
    if (newTargets.has(asset)) {
      newTargets.delete(asset);
    } else {
      newTargets.add(asset);
    }
    setTargetAssets(newTargets);
  };

  const toggleTargetTier = (tier: string) => {
    const newTargets = new Set(targetTiers);
    if (newTargets.has(tier)) {
      newTargets.delete(tier);
    } else {
      newTargets.add(tier);
    }
    setTargetTiers(newTargets);
  };

  const selectAllAssets = () => {
    setTargetAssets(new Set(assets.filter(a => a !== sourceAsset)));
  };

  const deselectAllAssets = () => {
    setTargetAssets(new Set());
  };

  const selectAllTiers = () => {
    setTargetTiers(new Set(tiers.filter(t => t !== sourceTier)));
  };

  const deselectAllTiers = () => {
    setTargetTiers(new Set());
  };

  if (matrix.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Bulk Copy Actions</h3>
            <p className="text-xs text-gray-600 mt-1">
              Copy spreads across assets or tiers
            </p>
          </div>
          <Button
            onClick={handleCopy}
            disabled={disabled || copying}
            size="sm"
          >
            <Copy className="h-4 w-4 mr-2" />
            {copying ? 'Copying...' : 'Copy'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Copy Mode Selection */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Copy Direction</label>
          <div className="flex gap-2">
            <Button
              variant={copyMode === 'row' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCopyMode('row')}
              className="flex-1"
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              Copy Row (Across Tiers)
            </Button>
            <Button
              variant={copyMode === 'column' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCopyMode('column')}
              className="flex-1"
            >
              <ChevronDown className="h-4 w-4 mr-2" />
              Copy Column (Down Assets)
            </Button>
          </div>
        </div>

        {/* Row Copy Configuration */}
        {copyMode === 'row' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Source Asset
              </label>
              <Select value={sourceAsset} onValueChange={setSourceAsset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset to copy from" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map(asset => (
                    <SelectItem key={asset} value={asset}>
                      {asset}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Target Assets ({targetAssets.size} selected)
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllAssets}
                    disabled={!sourceAsset}
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllAssets}
                    className="h-6 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {assets
                  .filter(asset => asset !== sourceAsset)
                  .map(asset => (
                    <button
                      key={asset}
                      onClick={() => toggleTargetAsset(asset)}
                      disabled={!sourceAsset}
                      className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {targetAssets.has(asset) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span>{asset}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Column Copy Configuration */}
        {copyMode === 'column' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1.5 block">
                Source Tier
              </label>
              <Select value={sourceTier} onValueChange={setSourceTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tier to copy from" />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map(tier => (
                    <SelectItem key={tier} value={tier}>
                      {tier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Target Tiers ({targetTiers.size} selected)
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllTiers}
                    disabled={!sourceTier}
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAllTiers}
                    className="h-6 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {tiers
                  .filter(tier => tier !== sourceTier)
                  .map(tier => (
                    <button
                      key={tier}
                      onClick={() => toggleTargetTier(tier)}
                      disabled={!sourceTier}
                      className="flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {targetTiers.has(tier) ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                      <span>{tier}</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Info Text */}
        <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-md">
          {copyMode === 'row' ? (
            <>
              <strong>Row Copy:</strong> Copy all spread values from the source asset
              across all tiers to the selected target assets.
            </>
          ) : (
            <>
              <strong>Column Copy:</strong> Copy all spread values from the source tier
              down to all assets in the selected target tiers.
            </>
          )}
        </div>
      </div>
    </div>
  );
}
