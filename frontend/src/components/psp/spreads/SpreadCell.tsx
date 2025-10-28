/**
 * Spread Cell Component
 * Inline editable cell for buy and sell spreads
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SpreadCellProps {
  buySpreadBps: number;
  sellSpreadBps: number;
  onChange: (buySpreadBps: number, sellSpreadBps: number) => void;
}

export function SpreadCell({
  buySpreadBps,
  sellSpreadBps,
  onChange,
}: SpreadCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [buyValue, setBuyValue] = useState(buySpreadBps.toString());
  const [sellValue, setSellValue] = useState(sellSpreadBps.toString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBuyValue(buySpreadBps.toString());
    setSellValue(sellSpreadBps.toString());
  }, [buySpreadBps, sellSpreadBps]);

  const handleSave = () => {
    const buyNum = parseInt(buyValue, 10);
    const sellNum = parseInt(sellValue, 10);

    // Validation
    if (isNaN(buyNum) || isNaN(sellNum)) {
      setError('Please enter valid numbers');
      return;
    }

    if (buyNum < 0 || sellNum < 0) {
      setError('Spreads cannot be negative');
      return;
    }

    if (buyNum > 10000 || sellNum > 10000) {
      setError('Spreads cannot exceed 10000 bps (100%)');
      return;
    }

    setError(null);
    onChange(buyNum, sellNum);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setBuyValue(buySpreadBps.toString());
    setSellValue(sellSpreadBps.toString());
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className="cursor-pointer hover:bg-gray-50 rounded p-2 transition-colors"
        onClick={() => setIsEditing(true)}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Buy:</span>
            <span className="font-medium">{buySpreadBps} bps</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Sell:</span>
            <span className="font-medium">{sellSpreadBps} bps</span>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">
          Click to edit
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 bg-blue-50 rounded">
      <div className="space-y-1">
        <Label htmlFor="buy-spread" className="text-xs">
          Buy (bps)
        </Label>
        <Input
          id="buy-spread"
          type="number"
          value={buyValue}
          onChange={(e) => setBuyValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs"
          autoFocus
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="sell-spread" className="text-xs">
          Sell (bps)
        </Label>
        <Input
          id="sell-spread"
          type="number"
          value={sellValue}
          onChange={(e) => setSellValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-7 text-xs"
        />
      </div>

      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}

      <div className="flex gap-1">
        <button
          onClick={handleSave}
          className="flex-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
