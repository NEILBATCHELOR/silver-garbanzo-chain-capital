/**
 * Simplified Chain ID Selector Component
 * Replaces the complex blockchain + environment selection with a single chain ID dropdown
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CHAIN_INFO, ChainInfo } from '@/infrastructure/web3/utils/chainIds';

export interface ChainIdSelectorProps {
  selectedChainId: number;
  onChainIdChange: (chainId: number) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
  showBadge?: boolean;
}

/**
 * Group chains by category for better organization
 */
const CHAIN_CATEGORIES = {
  'Ethereum': [1, 11155111, 17000, 560048],
  'Layer 2 - Arbitrum': [42161, 42170, 421614],
  'Layer 2 - Base': [8453, 84532],
  'Layer 2 - Optimism': [10, 11155420],
  'Layer 2 - Blast': [81457, 168587773],
  'Layer 2 - Scroll': [534352, 534351],
  'Layer 2 - zkSync': [324, 300],
  'Layer 2 - Polygon zkEVM': [1101, 2442],
  'Layer 2 - Linea': [59144, 59141],
  'Layer 2 - Mantle': [5000, 5003],
  'Layer 2 - Taiko': [167000, 167009],
  'Layer 2 - Sonic': [146, 14601],
  'Layer 2 - Unichain': [130, 1301],
  'Layer 2 - Abstract': [2741, 11124],
  'Layer 2 - Fraxtal': [252, 2522],
  'Layer 2 - Swellchain': [1923, 1924],
  'Polygon': [137, 80002],
  'BNB Chain': [56, 97, 204, 5611],
  'Avalanche': [43114, 43113],
  'Other Networks': [
    100, 42220, 44787, 1284, 1285, 1287, 80094, 80069, 1329, 1328,
    1776, 1439, 747474, 480, 4801, 50104, 531050104, 10143,
    199, 1029, 50, 51, 999, 33139, 33111, 43521
  ],
} as const;

const ChainIdSelector: React.FC<ChainIdSelectorProps> = ({
  selectedChainId,
  onChainIdChange,
  disabled = false,
  className,
  label = 'Select Network',
  showBadge = true
}) => {
  const selectedChainInfo = CHAIN_INFO[selectedChainId];

  const getChainBadge = (chainInfo: ChainInfo) => {
    if (!showBadge) return null;
    
    return chainInfo.type === 'mainnet' ? (
      <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
        Mainnet
      </Badge>
    ) : (
      <Badge variant="outline" className="ml-2 bg-yellow-50 text-yellow-700 border-yellow-200">
        Testnet
      </Badge>
    );
  };

  return (
    <div className={className}>
      <Label htmlFor="chain-id-selector">{label}</Label>
      <Select
        value={selectedChainId.toString()}
        onValueChange={(value) => onChainIdChange(parseInt(value))}
        disabled={disabled}
      >
        <SelectTrigger id="chain-id-selector" className="w-full">
          <SelectValue>
            {selectedChainInfo ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm">
                  {selectedChainInfo.name} (Chain ID: {selectedChainId})
                </span>
                {getChainBadge(selectedChainInfo)}
              </div>
            ) : (
              'Select a network'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[400px]">
          {Object.entries(CHAIN_CATEGORIES).map(([category, chainIds]) => (
            <React.Fragment key={category}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                {category}
              </div>
              {chainIds.map((chainId) => {
                const chainInfo = CHAIN_INFO[chainId];
                if (!chainInfo || chainInfo.deprecated) return null;
                
                return (
                  <SelectItem
                    key={chainId}
                    value={chainId.toString()}
                    className="pl-6"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm">
                        {chainInfo.name} ({chainId})
                      </span>
                      {getChainBadge(chainInfo)}
                    </div>
                  </SelectItem>
                );
              })}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>
      {selectedChainInfo?.explorer && (
        <p className="text-xs text-muted-foreground mt-1">
          Explorer: <a href={selectedChainInfo.explorer} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
            {selectedChainInfo.explorer}
          </a>
        </p>
      )}
    </div>
  );
};

export default ChainIdSelector;
