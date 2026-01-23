/**
 * Token Operations Wrapper
 * Fetches token data and passes to TokenOperationsPanel
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { TokenOperationsPanel } from './TokenOperationsPanel';
import { supabase } from '@/infrastructure/database/client';

interface TokenData {
  id: string;
  contract_address: string;
  network: string;
  decimals: number;
  name: string;
  symbol: string;
}

export function TokenOperationsWrapper() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId]);

  const loadTokenData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('tokens')
        .select('id, contract_address, network, decimals, name, symbol')
        .eq('id', tokenId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Token not found');

      setTokenData(data);
    } catch (err: any) {
      console.error('Error loading token:', err);
      setError(err.message || 'Failed to load token');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Error: {error || 'Token not found'}</p>
      </Card>
    );
  }

  // Map network name to expected format
  const network = tokenData.network.toLowerCase().includes('devnet') 
    ? 'devnet' 
    : tokenData.network.toLowerCase().includes('testnet')
    ? 'testnet'
    : 'mainnet-beta';

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{tokenData.name} ({tokenData.symbol})</h1>
        <p className="text-sm text-muted-foreground">
          {tokenData.contract_address.slice(0, 8)}...{tokenData.contract_address.slice(-8)}
        </p>
      </div>
      <TokenOperationsPanel
        mint={tokenData.contract_address}
        decimals={tokenData.decimals}
        network={network as any}
      />
    </div>
  );
}
