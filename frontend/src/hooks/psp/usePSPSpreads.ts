/**
 * PSP Spreads Management Hook
 * Manages spread configurations for projects
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

export interface SpreadConfig {
  id: string;
  projectId: string;
  cryptoAsset: string;
  network: string | null;
  tierName: string;
  tierMin: number;
  tierMax: number | null;
  buySpreadBps: number;
  sellSpreadBps: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface SpreadMatrixRow {
  cryptoAsset: string;
  network: string | null;
  tiers: Record<string, {
    buySpreadBps: number;
    sellSpreadBps: number;
    tierMin: number;
    tierMax: number | null;
  }>;
}

export interface UpdateSpreadParams {
  projectId: string;
  cryptoAsset: string;
  network?: string | null;
  tierName: string;
  tierMin: number;
  tierMax?: number | null;
  buySpreadBps: number;
  sellSpreadBps: number;
}

export interface CopySpreadParams {
  projectId: string;
  direction: 'row' | 'column';
  source: {
    cryptoAsset?: string;
    tierName?: string;
  };
  targets: Array<{
    cryptoAsset?: string;
    tierName?: string;
  }>;
}

export function usePSPSpreads(projectId: string) {
  const [matrix, setMatrix] = useState<SpreadMatrixRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const { toast } = useToast();

  const fetchMatrix = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/psp/spreads/matrix?projectId=${projectId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch spread matrix: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.matrix) {
        setMatrix(data.matrix);
        setInitialized(true);
      } else {
        throw new Error('Failed to fetch spread matrix');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching spread matrix:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateSpread = async (params: UpdateSpreadParams): Promise<boolean> => {
    try {
      const response = await fetch('/api/psp/spreads', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to update spread: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Spread updated successfully',
        });
        await fetchMatrix(); // Refresh matrix
        return true;
      } else {
        throw new Error('Failed to update spread');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to update spread: ${message}`,
        variant: 'destructive',
      });
      return false;
    }
  };

  const copySpreads = async (params: CopySpreadParams): Promise<boolean> => {
    try {
      const response = await fetch('/api/psp/spreads/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Failed to copy spreads: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Copied ${data.copiedCount} spread configurations`,
        });
        await fetchMatrix(); // Refresh matrix
        return true;
      } else {
        throw new Error('Failed to copy spreads');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to copy spreads: ${message}`,
        variant: 'destructive',
      });
      return false;
    }
  };

  const initializeDefaults = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/psp/spreads/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize spreads: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Default spreads initialized successfully',
        });
        await fetchMatrix(); // Refresh matrix
        return true;
      } else {
        throw new Error('Failed to initialize spreads');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to initialize spreads: ${message}`,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchMatrix();
  }, [fetchMatrix]);

  return {
    matrix,
    loading,
    error,
    initialized,
    refresh: fetchMatrix,
    updateSpread,
    copySpreads,
    initializeDefaults,
  };
}
