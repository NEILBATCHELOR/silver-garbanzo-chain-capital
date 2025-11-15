/**
 * OracleSourcesPanel Component
 * 
 * View and manage price sources with:
 * - List of active sources
 * - Source status (active/inactive/error)
 * - Last successful fetch timestamp
 * - Source type and provider information
 * - Enable/disable sources
 * - Test connection button
 * 
 * @priority Medium-Low (Admin)
 * @usage Admin settings, oracle monitoring
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/utils/utils';

interface OracleSource {
  id: string;
  type: 'oracle' | 'market' | 'manual' | 'aggregated';
  provider: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  lastFetch?: string;
  lastError?: string;
  confidence: number;
  url?: string;
}

interface OracleSourcesPanelProps {
  tokenId?: string;
  className?: string;
}

// Mock data - in real implementation, this would come from a service/hook
const MOCK_SOURCES: OracleSource[] = [
  {
    id: '1',
    type: 'oracle',
    provider: 'chainlink',
    name: 'Chainlink',
    description: 'Decentralized oracle network with crypto-economic security',
    status: 'active',
    lastFetch: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    confidence: 95,
    url: 'https://chain.link'
  },
  {
    id: '2',
    type: 'oracle',
    provider: 'pyth',
    name: 'Pyth Network',
    description: 'High-frequency price feeds from first-party data providers',
    status: 'active',
    lastFetch: new Date(Date.now() - 90000).toISOString(), // 1.5 minutes ago
    confidence: 92,
    url: 'https://pyth.network'
  },
  {
    id: '3',
    type: 'market',
    provider: 'coingecko',
    name: 'CoinGecko',
    description: 'Market data aggregator with 10,000+ cryptocurrencies',
    status: 'active',
    lastFetch: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    confidence: 88,
    url: 'https://coingecko.com'
  },
  {
    id: '4',
    type: 'market',
    provider: 'coinmarketcap',
    name: 'CoinMarketCap',
    description: 'Leading cryptocurrency market data provider',
    status: 'inactive',
    confidence: 0
  }
];

export function OracleSourcesPanel({ tokenId, className }: OracleSourcesPanelProps) {
  const [sources, setSources] = useState<OracleSource[]>(MOCK_SOURCES);
  const [testing, setTesting] = useState<string | null>(null);

  // Format time ago
  const formatTimeAgo = (timestamp?: string) => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Toggle source
  const toggleSource = (id: string) => {
    setSources(prev =>
      prev.map(source =>
        source.id === id
          ? {
              ...source,
              status: source.status === 'active' ? 'inactive' : 'active'
            }
          : source
      )
    );
  };

  // Test connection
  const testConnection = async (id: string) => {
    setTesting(id);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setSources(prev =>
      prev.map(source =>
        source.id === id
          ? {
              ...source,
              status: 'active',
              lastFetch: new Date().toISOString(),
              confidence: Math.floor(Math.random() * 10) + 90
            }
          : source
      )
    );

    setTesting(null);
  };

  // Get status icon
  const getStatusIcon = (status: OracleSource['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <Radio className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: OracleSource['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
    }
  };

  // Get type badge
  const getTypeBadge = (type: OracleSource['type']) => {
    const variants = {
      oracle: { label: 'Oracle', variant: 'default' as const },
      market: { label: 'Market', variant: 'secondary' as const },
      manual: { label: 'Manual', variant: 'outline' as const },
      aggregated: { label: 'Aggregated', variant: 'outline' as const }
    };

    const config = variants[type];
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
  };

  const activeSources = sources.filter(s => s.status === 'active').length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Price Sources
            </CardTitle>
            <CardDescription>
              Manage oracle and market data providers
            </CardDescription>
          </div>
          <div className="text-sm">
            <Badge variant="outline">
              {activeSources} / {sources.length} Active
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeSources < 2 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              At least 2 active sources recommended for reliable price data
            </AlertDescription>
          </Alert>
        )}

        {sources.map((source, index) => (
          <React.Fragment key={source.id}>
            {index > 0 && <Separator />}
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(source.status)}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{source.name}</h4>
                      {getTypeBadge(source.type)}
                      {getStatusBadge(source.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {source.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={source.status === 'active'}
                  onCheckedChange={() => toggleSource(source.id)}
                />
              </div>

              {/* Details */}
              {source.status === 'active' && (
                <div className="ml-7 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Last Fetch</div>
                    <div className="text-sm font-medium">
                      {formatTimeAgo(source.lastFetch)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                    <div className="text-sm font-medium">
                      {source.confidence}%
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {source.lastError && (
                <Alert variant="destructive" className="ml-7">
                  <AlertDescription className="text-xs">
                    {source.lastError}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="ml-7 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testConnection(source.id)}
                  disabled={testing === source.id}
                >
                  {testing === source.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                {source.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Visit Site
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * CompactSourceStatus Component
 * 
 * Smaller version showing just source count and status
 */
interface CompactSourceStatusProps {
  className?: string;
}

export function CompactSourceStatus({ className }: CompactSourceStatusProps) {
  const sources = MOCK_SOURCES;
  const activeSources = sources.filter(s => s.status === 'active').length;
  const hasError = sources.some(s => s.status === 'error');

  return (
    <div className={cn('flex items-center gap-3 p-3 border rounded-lg', className)}>
      <Radio className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Sources:</span>
        <Badge variant={activeSources >= 2 ? 'default' : 'destructive'}>
          {activeSources} Active
        </Badge>
        {hasError && <Badge variant="destructive">Has Errors</Badge>}
      </div>
    </div>
  );
}
