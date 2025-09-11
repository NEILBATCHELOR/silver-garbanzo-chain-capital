import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft,
  Wallet,
  ArrowRightLeft,
  ExternalLink,
  Copy,
  QrCode,
  RefreshCw,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData, WalletAsset } from '@/types/dfns';

/**
 * DFNS Wallet Details View
 * Comprehensive wallet overview with assets and activity
 */
export function WalletDetailsView() {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [assets, setAssets] = useState<WalletAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load wallet details
  const loadWalletDetails = async () => {
    if (!walletId) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      
      // Get wallet details and assets
      const [walletData, walletAssets] = await Promise.all([
        dfnsService.getWalletService().getWallet(walletId),
        dfnsService.getWalletAssetsService().getWalletAssets(walletId, true)
      ]);

      setWallet(walletData);
      setAssets(walletAssets.assets || []);

    } catch (error: any) {
      console.error('Failed to load wallet details:', error);
      setError(`Failed to load wallet: ${error.message}`);
      toast({
        title: "Error",
        description: "Failed to load wallet details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWalletDetails();
  }, [walletId]);

  // Copy address to clipboard
  const copyAddress = () => {
    if (wallet?.address) {
      navigator.clipboard.writeText(wallet.address);
      toast({
        title: "Copied",
        description: "Wallet address copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading wallet details...</p>
        </div>
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {error || 'Wallet not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const totalValue = assets.reduce((sum, asset) => {
    const balance = parseFloat(asset.balance) || 0;
    const valueInUsd = parseFloat(asset.valueInUsd || '0') || 0;
    return sum + valueInUsd;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Wallet className="h-6 w-6" />
                  {wallet.name || 'Unnamed Wallet'}
                </h1>
                <p className="text-sm text-muted-foreground">{wallet.network} Network</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={loadWalletDetails}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm">
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfer
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Wallet Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Address</div>
                <div className="flex items-center space-x-2">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                    {wallet.address}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyAddress}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Network</div>
                <Badge>{wallet.network}</Badge>
              </div>

              <div>
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Total Value</div>
                <div className="text-2xl font-bold">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground mb-1">Assets</div>
                <div className="text-lg font-medium">{assets.length}</div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Explorer
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>
              Digital assets held in this wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Assets Found</h3>
                <p className="text-muted-foreground">
                  This wallet doesn't contain any assets yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assets.map((asset, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {asset.symbol?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{asset.symbol || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">
                          {asset.symbol || 'Unknown Asset'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {parseFloat(asset.balance || '0').toFixed(6)} {asset.symbol}
                      </div>
                      {asset.valueInUsd && (
                        <div className="text-sm text-muted-foreground">
                          ${parseFloat(asset.valueInUsd).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}