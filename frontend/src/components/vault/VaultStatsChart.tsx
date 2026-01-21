/**
 * VaultStatsChart Component
 * 
 * Displays exchange rate history and performance charts
 * TODO: Implement chart visualization
 */

import React from 'react';

interface VaultStatsChartProps {
  positions: any[];
}

export const VaultStatsChart: React.FC<VaultStatsChartProps> = ({
  positions
}) => {
  return (
    <div className="h-64 flex items-center justify-center border rounded-lg">
      <p className="text-sm text-muted-foreground">
        Chart visualization coming soon...
      </p>
    </div>
  );
};
