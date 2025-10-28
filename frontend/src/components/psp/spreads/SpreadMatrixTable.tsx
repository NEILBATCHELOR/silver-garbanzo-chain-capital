/**
 * Spread Matrix Table Component
 * Displays and allows editing of spread configurations in a matrix format
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, ChevronRight, ChevronDown } from 'lucide-react';
import { SpreadMatrixRow, UpdateSpreadParams, CopySpreadParams } from '@/hooks/psp';
import { SpreadCell } from './SpreadCell';

interface SpreadMatrixTableProps {
  matrix: SpreadMatrixRow[];
  loading: boolean;
  onUpdate: (params: UpdateSpreadParams) => Promise<boolean>;
  onCopy: (params: CopySpreadParams) => Promise<boolean>;
  onCellSelect?: (asset: string, tier: string) => void;
}

export function SpreadMatrixTable({
  matrix,
  loading,
  onUpdate,
  onCopy,
  onCellSelect,
}: SpreadMatrixTableProps) {
  const [pendingChanges, setPendingChanges] = useState<Map<string, UpdateSpreadParams>>(new Map());
  const [selectedCell, setSelectedCell] = useState<{ asset: string; tier: string } | null>(null);

  // Get all unique tier names from the matrix
  const tierNames = matrix.length > 0
    ? Object.keys(matrix[0].tiers).sort((a, b) => {
        // Sort by tierMin
        const aTier = matrix[0].tiers[a];
        const bTier = matrix[0].tiers[b];
        return aTier.tierMin - bTier.tierMin;
      })
    : [];

  const handleCellChange = (
    asset: string,
    network: string | null,
    tierName: string,
    tierMin: number,
    tierMax: number | null,
    buySpreadBps: number,
    sellSpreadBps: number
  ) => {
    const key = `${asset}-${network || 'null'}-${tierName}`;
    const change: UpdateSpreadParams = {
      projectId: '', // Will be filled by parent
      cryptoAsset: asset,
      network,
      tierName,
      tierMin,
      tierMax,
      buySpreadBps,
      sellSpreadBps,
    };
    
    const newChanges = new Map(pendingChanges);
    newChanges.set(key, change);
    setPendingChanges(newChanges);
  };

  const handleSaveChanges = async () => {
    for (const change of pendingChanges.values()) {
      await onUpdate(change);
    }
    setPendingChanges(new Map());
  };

  const handleCopyRow = async (asset: string) => {
    const row = matrix.find(r => r.cryptoAsset === asset);
    if (!row) return;

    await onCopy({
      projectId: '', // Will be filled by parent
      direction: 'row',
      source: { cryptoAsset: asset },
      targets: matrix
        .filter(r => r.cryptoAsset !== asset)
        .map(r => ({ cryptoAsset: r.cryptoAsset })),
    });
  };

  const handleCopyColumn = async (tierName: string) => {
    if (matrix.length === 0) return;

    await onCopy({
      projectId: '', // Will be filled by parent
      direction: 'column',
      source: { tierName },
      targets: tierNames
        .filter(t => t !== tierName)
        .map(t => ({ tierName: t })),
    });
  };

  const handleCellClick = (asset: string, tier: string) => {
    setSelectedCell({ asset, tier });
    onCellSelect?.(asset, tier);
  };

  if (loading && matrix.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-gray-600">Loading spread matrix...</div>
      </div>
    );
  }

  if (matrix.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-sm text-gray-600 mb-4">
          No spread configurations found.
        </div>
        <div className="text-xs text-gray-500">
          Click "Initialize Defaults" to create default spread configurations.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pending Changes Banner */}
      {pendingChanges.size > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm text-yellow-800">
            {pendingChanges.size} unsaved change{pendingChanges.size > 1 ? 's' : ''}
          </div>
          <Button onClick={handleSaveChanges} size="sm">
            Save Changes
          </Button>
        </div>
      )}

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border p-3 text-left text-sm font-semibold min-w-[160px]">
                Asset / Tier
              </th>
              {tierNames.map((tierName) => (
                <th key={tierName} className="border p-3 text-center text-sm font-semibold min-w-[120px]">
                  <div className="flex flex-col items-center gap-2">
                    <span>{tierName}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyColumn(tierName)}
                      className="h-6 px-2"
                    >
                      <ChevronDown className="h-3 w-3 mr-1" />
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={`${row.cryptoAsset}-${row.network || 'null'}`} className="hover:bg-gray-50">
                <td className="border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{row.cryptoAsset}</div>
                      {row.network && (
                        <div className="text-xs text-gray-500">{row.network}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyRow(row.cryptoAsset)}
                      className="h-6 px-2"
                    >
                      <ChevronRight className="h-3 w-3 mr-1" />
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
                {tierNames.map((tierName) => {
                  const tierData = row.tiers[tierName];
                  if (!tierData) return <td key={tierName} className="border p-3" />;

                  const isSelected = selectedCell?.asset === row.cryptoAsset && 
                    selectedCell?.tier === tierName;

                  return (
                    <td 
                      key={tierName} 
                      className={`border p-3 ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => handleCellClick(row.cryptoAsset, tierName)}
                    >
                      <SpreadCell
                        buySpreadBps={tierData.buySpreadBps}
                        sellSpreadBps={tierData.sellSpreadBps}
                        onChange={(buy, sell) => 
                          handleCellChange(
                            row.cryptoAsset,
                            row.network,
                            tierName,
                            tierData.tierMin,
                            tierData.tierMax,
                            buy,
                            sell
                          )
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
