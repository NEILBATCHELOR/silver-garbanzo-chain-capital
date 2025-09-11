import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Wallet, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  Info,
  Shield
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// Import DFNS services and types
import { getDfnsService, initializeDfnsService } from '@/services/dfns';
import type { WalletData } from '@/types/dfns';

interface WalletCreationWizardProps {
  onWalletCreated?: (wallet: WalletData) => void;
  modal?: boolean;
  children?: React.ReactNode;
}

// Supported networks for wallet creation
const SUPPORTED_NETWORKS = [
  { value: 'Ethereum', label: 'Ethereum', description: 'EVM-compatible smart contracts' },
  { value: 'Bitcoin', label: 'Bitcoin', description: 'Original cryptocurrency network' },
  { value: 'Polygon', label: 'Polygon', description: 'Fast, low-cost Ethereum scaling' },
  { value: 'Arbitrum', label: 'Arbitrum', description: 'Ethereum Layer 2 scaling' },
  { value: 'Base', label: 'Base', description: 'Coinbase Layer 2 network' },
  { value: 'Optimism', label: 'Optimism', description: 'Optimistic Ethereum scaling' },
  { value: 'Solana', label: 'Solana', description: 'High-performance blockchain' },
  { value: 'Avalanche', label: 'Avalanche', description: 'Fast, low-cost smart contracts' },
  { value: 'BinanceSmartChain', label: 'BSC', description: 'Binance Smart Chain' },
  { value: 'Fantom', label: 'Fantom', description: 'High-speed smart contracts' }
];

/**
 * DFNS Wallet Creation Wizard
 * Multi-step wallet creation with User Action Signing
 * Supports 30+ blockchain networks
 */
export function WalletCreationWizard({ 
  onWalletCreated, 
  modal = true,
  children 
}: WalletCreationWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    network: '',
    name: '',
    description: ''
  });

  // Authentication state
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: false,
    supportsUserActionSigning: false,
    user: null as any
  });

  // Load authentication status
  useEffect(() => {
    const loadAuthStatus = async () => {
      try {
        const dfnsService = await initializeDfnsService();
        const status = await dfnsService.getAuthenticationStatusAsync();
        
        setAuthStatus({
          isAuthenticated: status.isAuthenticated,
          supportsUserActionSigning: dfnsService.supportsUserActionSigning(),
          user: status.user
        });
      } catch (error) {
        console.error('Failed to load auth status:', error);
      }
    };

    if (isOpen) {
      loadAuthStatus();
    }
  }, [isOpen]);

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  // Validate form data
  const validateForm = (): boolean => {
    if (!formData.network) {
      setError('Please select a blockchain network');
      return false;
    }
    
    if (!formData.name.trim()) {
      setError('Please enter a wallet name');
      return false;
    }

    if (formData.name.length < 3) {
      setError('Wallet name must be at least 3 characters');
      return false;
    }

    return true;
  };

  // Handle wallet creation
  const handleCreateWallet = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      const dfnsService = await initializeDfnsService();
      
      if (!authStatus.isAuthenticated) {
        setError('Authentication required. Please login to DFNS first.');
        return;
      }

      // Create wallet with User Action Signing
      const wallet = await dfnsService.createWallet(
        formData.network,
        formData.name,
        // User Action Token will be handled by the service internally
        undefined
      );

      toast({
        title: "Success",
        description: `Wallet "${formData.name}" created successfully on ${formData.network}`,
      });

      // Reset form
      setFormData({ network: '', name: '', description: '' });
      setStep(1);
      setIsOpen(false);

      // Notify parent component
      if (onWalletCreated) {
        onWalletCreated(wallet);
      }

    } catch (error: any) {
      console.error('Wallet creation failed:', error);
      
      if (error.message.includes('User action required')) {
        setError('User Action Signing required. Please complete the authentication prompt.');
      } else if (error.message.includes('Invalid or expired token')) {
        setError('Authentication token expired. Please refresh your DFNS session.');
      } else {
        setError(`Failed to create wallet: ${error.message}`);
      }

      toast({
        title: "Error",
        description: "Failed to create wallet",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="network">Blockchain Network *</Label>
              <Select value={formData.network} onValueChange={(value) => handleInputChange('network', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a blockchain network" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_NETWORKS.map((network) => (
                    <SelectItem key={network.value} value={network.value}>
                      <div className="flex flex-col">
                        <span>{network.label}</span>
                        <span className="text-xs text-muted-foreground">{network.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Wallet Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter wallet name (e.g., Main ETH Wallet)"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description for this wallet"
                className="mt-1"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Ready to Create Wallet</h3>
              <p className="text-muted-foreground mb-6">
                Please review your wallet configuration before creating
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Network:</span>
                    <Badge>{formData.network}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Name:</span>
                    <span className="text-sm">{formData.name}</span>
                  </div>
                  {formData.description && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Description:</span>
                      <span className="text-sm">{formData.description}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {authStatus.supportsUserActionSigning && (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  This wallet creation will require User Action Signing for enhanced security.
                  You may be prompted to authenticate with your credentials.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Render step buttons
  const renderStepButtons = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex justify-end">
            <Button
              onClick={() => setStep(2)}
              disabled={!formData.network || !formData.name.trim()}
            >
              Next
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button 
              onClick={handleCreateWallet} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Create Wallet
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center space-x-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          1
        </div>
        <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`} />
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
        }`}>
          2
        </div>
      </div>

      {/* Authentication warning */}
      {!authStatus.isAuthenticated && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-700">
            Authentication required. Please login to DFNS to create wallets.
          </AlertDescription>
        </Alert>
      )}

      {/* Error display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Step content */}
      {renderStepContent()}

      {/* Step buttons */}
      {authStatus.isAuthenticated && renderStepButtons()}
    </div>
  );

  if (!modal) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Wallet
          </CardTitle>
          <CardDescription>
            Create a new multi-signature wallet on any supported blockchain network
          </CardDescription>
        </CardHeader>
        <CardContent>
          {content}
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Wallet
          </DialogTitle>
          <DialogDescription>
            Create a new multi-signature wallet on any supported blockchain network
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}