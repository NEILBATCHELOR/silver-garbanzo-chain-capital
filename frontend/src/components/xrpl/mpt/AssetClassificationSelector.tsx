/**
 * Asset Classification Selector
 * 
 * Relational dropdown component for selecting MPT asset class and subclass
 * following XLS-89 metadata standard
 * 
 * Features:
 * - Cascading dropdowns (asset class → asset subclass)
 * - Automatic validation (RWA requires subclass)
 * - Auto-clear subclass when changing from RWA to other class
 * - Helpful descriptions and examples in tooltips
 * 
 * @see /docs/XLS-89_ASSET_TAXONOMY.md
 * @see /frontend/src/types/xrpl/asset-taxonomy.ts
 */

import React, { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AssetClass,
  AssetSubclass,
  ASSET_CLASSES,
  ASSET_SUBCLASSES,
  requiresSubclass
} from '@/types/xrpl/asset-taxonomy';

interface AssetClassificationSelectorProps {
  assetClass: AssetClass | null;
  assetSubclass: AssetSubclass | null;
  onAssetClassChange: (assetClass: AssetClass | null) => void;
  onAssetSubclassChange: (assetSubclass: AssetSubclass | null) => void;
  disabled?: boolean;
  error?: string;
  showExamples?: boolean;
}

export function AssetClassificationSelector({
  assetClass,
  assetSubclass,
  onAssetClassChange,
  onAssetSubclassChange,
  disabled = false,
  error,
  showExamples = true
}: AssetClassificationSelectorProps) {

  // Auto-clear subclass when changing from RWA to non-RWA
  useEffect(() => {
    if (assetClass !== 'rwa' && assetSubclass) {
      onAssetSubclassChange(null);
    }
  }, [assetClass, assetSubclass, onAssetSubclassChange]);

  const showSubclassDropdown = assetClass === 'rwa';
  const isSubclassRequired = requiresSubclass(assetClass);

  return (
    <div className="space-y-4">
      {/* Asset Class Dropdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="asset-class">
            Asset Class
            <span className="text-destructive ml-1">*</span>
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Primary category of your token. Real World Assets (RWA) require
                  a subclass to specify the type of asset.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Select
          value={assetClass || ''}
          onValueChange={(value) => onAssetClassChange(value as AssetClass)}
          disabled={disabled}
        >
          <SelectTrigger id="asset-class" className={error ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select asset class" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Asset Classes</SelectLabel>
              {ASSET_CLASSES.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                >
                  <TooltipProvider>
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <span>{option.label}</span>
                          {option.requiresSubclass && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0">
                              +Subclass
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-sm">{option.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      {/* Asset Subclass Dropdown (Only shown for RWA) */}
      {showSubclassDropdown && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="asset-subclass">
              Asset Subclass
              {isSubclassRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Specific type of Real World Asset. This helps indexers and
                    wallets categorize your token correctly.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Select
            value={assetSubclass || ''}
            onValueChange={(value) => onAssetSubclassChange(value as AssetSubclass)}
            disabled={disabled}
          >
            <SelectTrigger id="asset-subclass">
              <SelectValue placeholder="Select RWA subclass" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>RWA Subclasses</SelectLabel>
                {ASSET_SUBCLASSES.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                  >
                    <TooltipProvider>
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span>{option.label}</span>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-sm">
                          <p className="text-sm mb-2">{option.description}</p>
                          {showExamples && option.examples && option.examples.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold">Examples:</p>
                              <div className="flex flex-wrap gap-1">
                                {option.examples.slice(0, 3).map((example, idx) => (
                                  <Badge
                                    key={idx}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {example}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          
          {isSubclassRequired && !assetSubclass && (
            <p className="text-sm text-muted-foreground">
              Real World Assets require a subclass selection
            </p>
          )}
        </div>
      )}
    </div>
  );
}
