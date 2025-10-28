/**
 * PSP Spreads Configuration Page
 * Main page for managing spread configurations
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePSPSpreads, usePSPMarketRates } from '@/hooks/psp';
import { SpreadMatrixTable } from './SpreadMatrixTable';
import { RatePreview } from './RatePreview';
import { CopyActionsToolbar } from './CopyActionsToolbar';

export function SpreadsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showCopyToolbar, setShowCopyToolbar] = useState(true);

  // Default assets to track for rate preview
  const defaultAssets = ['BTC', 'ETH', 'USDC', 'USDT'];

  const {
    matrix,
    loading: spreadsLoading,
    error: spreadsError,
    initialized,
    refresh: refreshSpreads,
    updateSpread,
    copySpreads,
    initializeDefaults,
  } = usePSPSpreads(projectId || '');

  const {
    rates,
    loading: ratesLoading,
    error: ratesError,
    lastUpdated,
    refresh: refreshRates,
  } = usePSPMarketRates({
    assets: defaultAssets,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
  });

  const handleRefreshAll = async () => {
    await Promise.all([refreshSpreads(), refreshRates()]);
  };

  const handleInitializeDefaults = async () => {
    await initializeDefaults();
  };

  if (!projectId) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Project ID is required. Please select a project.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Spreads Configuration
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Configure buy and sell spreads for different transaction sizes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!initialized && !spreadsLoading && (
              <Button
                onClick={handleInitializeDefaults}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Initialize Defaults
              </Button>
            )}
            <Button
              onClick={() => setShowCopyToolbar(!showCopyToolbar)}
              variant="outline"
              size="sm"
            >
              {showCopyToolbar ? 'Hide' : 'Show'} Bulk Copy
            </Button>
            <Button
              onClick={handleRefreshAll}
              variant="outline"
              size="sm"
              disabled={spreadsLoading || ratesLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(spreadsLoading || ratesLoading) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Errors */}
      {(spreadsError || ratesError) && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {spreadsError || ratesError}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Matrix Table */}
          <div className="xl:col-span-2 space-y-6">
            {/* Copy Actions Toolbar */}
            {showCopyToolbar && initialized && (
              <CopyActionsToolbar
                matrix={matrix}
                onCopy={copySpreads}
                disabled={spreadsLoading}
              />
            )}

            {/* Matrix Table */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Spread Matrix</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Edit spreads inline or use bulk copy actions above
                </p>
              </div>
              <div className="p-4">
                <SpreadMatrixTable
                  matrix={matrix}
                  loading={spreadsLoading}
                  onUpdate={updateSpread}
                  onCopy={copySpreads}
                  onCellSelect={(asset, tier) => {
                    setSelectedAsset(asset);
                    setSelectedTier(tier);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Rate Preview Sidebar */}
          <div className="xl:col-span-1">
            <RatePreview
              rates={rates}
              matrix={matrix}
              loading={ratesLoading}
              lastUpdated={lastUpdated}
              selectedAsset={selectedAsset}
              selectedTier={selectedTier}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
