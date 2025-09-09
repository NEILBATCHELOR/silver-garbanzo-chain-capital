import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, 
  ChevronRight, 
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  Info,
  Plus,
  Bitcoin,
  Zap,
  Globe,
  Shield,
  Coins
} from "lucide-react";
import { cn } from "@/utils/utils";
import { useState, useEffect } from "react";
import { DfnsService } from "../../../../services/dfns";
import type { 
  DfnsCreateWalletRequest,
  DfnsNetwork,
  DfnsKeyScheme,
  DfnsKeyCurve 
} from "../../../../types/dfns";

interface NetworkInfo {
  network: DfnsNetwork;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  isTestnet: boolean;
  estimatedConfirmationTime: string;
  nativeCurrency: string;
  explorerUrl: string;
  supported: boolean;
}

interface WalletCreationData {
  network: DfnsNetwork;
  name: string;
  tags: string[];
  keyScheme?: DfnsKeyScheme;
  keyCurve?: DfnsKeyCurve;
  externalId?: string;
}

/**
 * Wallet Creation Wizard Dialog
 * Multi-step wizard for creating wallets across 30+ blockchain networks
 */
export function WalletCreationWizard() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [walletData, setWalletData] = useState<WalletCreationData>({
    network: 'Ethereum',
    name: '',
    tags: [],
  });

  // Available networks (30+ supported by DFNS)
  const [networks] = useState<NetworkInfo[]>([
    {
      network: 'Ethereum',
      name: 'Ethereum',
      description: 'Leading smart contract platform',
      icon: <Zap className="h-5 w-5" />,
      category: 'Layer 1',
      isTestnet: false,
      estimatedConfirmationTime: '1-2 minutes',
      nativeCurrency: 'ETH',
      explorerUrl: 'https://etherscan.io',
      supported: true
    },
    {
      network: 'Bitcoin',
      name: 'Bitcoin',
      description: 'Original cryptocurrency network',
      icon: <Bitcoin className="h-5 w-5" />,
      category: 'Layer 1',
      isTestnet: false,
      estimatedConfirmationTime: '10-60 minutes',
      nativeCurrency: 'BTC',
      explorerUrl: 'https://blockstream.info',
      supported: true
    },
    {
      network: 'Polygon',
      name: 'Polygon',
      description: 'Ethereum Layer 2 scaling solution',
      icon: <Globe className="h-5 w-5" />,
      category: 'Layer 2',
      isTestnet: false,
      estimatedConfirmationTime: '2-5 seconds',
      nativeCurrency: 'MATIC',
      explorerUrl: 'https://polygonscan.com',
      supported: true
    },
    {
      network: 'Arbitrum',
      name: 'Arbitrum One',
      description: 'Optimistic rollup for Ethereum',
      icon: <Shield className="h-5 w-5" />,
      category: 'Layer 2',
      isTestnet: false,
      estimatedConfirmationTime: '1-2 minutes',
      nativeCurrency: 'ETH',
      explorerUrl: 'https://arbiscan.io',
      supported: true
    },
    {
      network: 'Optimism',
      name: 'Optimism',
      description: 'Optimistic rollup for Ethereum',
      icon: <Coins className="h-5 w-5" />,
      category: 'Layer 2',
      isTestnet: false,
      estimatedConfirmationTime: '1-2 minutes',
      nativeCurrency: 'ETH',
      explorerUrl: 'https://optimistic.etherscan.io',
      supported: true
    },
    {
      network: 'Solana',
      name: 'Solana',
      description: 'High-performance blockchain',
      icon: <Zap className="h-5 w-5" />,
      category: 'Layer 1',
      isTestnet: false,
      estimatedConfirmationTime: '400-800ms',
      nativeCurrency: 'SOL',
      explorerUrl: 'https://explorer.solana.com',
      supported: true
    },
    {
      network: 'Avalanche',
      name: 'Avalanche',
      description: 'Fast smart contracts platform',
      icon: <Globe className="h-5 w-5" />,
      category: 'Layer 1',
      isTestnet: false,
      estimatedConfirmationTime: '1-2 seconds',
      nativeCurrency: 'AVAX',
      explorerUrl: 'https://snowtrace.io',
      supported: true
    },
    {
      network: 'Binance',
      name: 'BNB Chain',
      description: 'Binance Smart Chain',
      icon: <Coins className="h-5 w-5" />,
      category: 'Layer 1',
      isTestnet: false,
      estimatedConfirmationTime: '3 seconds',
      nativeCurrency: 'BNB',
      explorerUrl: 'https://bscscan.com',
      supported: true
    }
  ]);

  // Filtered networks
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  
  const filteredNetworks = networks.filter(network => {
    const matchesSearch = network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         network.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || network.category === selectedCategory;
    return network.supported && matchesSearch && matchesCategory;
  });

  // DFNS service
  const [dfnsService, setDfnsService] = useState<DfnsService | null>(null);

  useEffect(() => {
    const initializeDfns = async () => {
      try {
        const service = new DfnsService();
        await service.initialize();
        setDfnsService(service);
      } catch (error) {
        console.error('Failed to initialize DFNS service:', error);
        setError('Failed to initialize DFNS service');
      }
    };

    initializeDfns();
  }, []);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setError(null);
      setSuccess(false);
      setWalletData({
        network: 'Ethereum',
        name: '',
        tags: [],
      });
    }
  }, [open]);

  const handleNext = () => {
    setError(null);
    
    // Validate current step
    if (currentStep === 1 && !walletData.network) {
      setError('Please select a network');
      return;
    }
    
    if (currentStep === 2 && !walletData.name.trim()) {
      setError('Please enter a wallet name');
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevious = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateWallet = async () => {
    if (!dfnsService || !walletData.network || !walletData.name.trim()) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const walletService = dfnsService.getWalletService();
      
      // Create wallet request
      const request: DfnsCreateWalletRequest = {
        network: walletData.network,
        name: walletData.name.trim(),
        ...(walletData.keyScheme && { keyScheme: walletData.keyScheme }),
        ...(walletData.keyCurve && { keyCurve: walletData.keyCurve }),
        ...(walletData.externalId && { externalId: walletData.externalId })
      };

      // Create wallet with User Action Signing
      const newWallet = await walletService.createWallet(request, {
        syncToDatabase: true,
        autoActivate: true,
        createWithTags: walletData.tags.length > 0 ? walletData.tags : undefined
      });

      console.log('Created wallet:', newWallet);
      setSuccess(true);
      setCurrentStep(4); // Move to success step
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setOpen(false);
      }, 2000);

    } catch (error) {
      console.error('Failed to create wallet:', error);
      setError(`Failed to create wallet: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !walletData.tags.includes(tag)) {
      setWalletData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setWalletData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const selectedNetwork = networks.find(n => n.network === walletData.network);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Select Blockchain Network</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the blockchain network for your new wallet
              </p>
            </div>

            <div className="flex space-x-2 mb-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search networks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Layer 1">Layer 1</SelectItem>
                  <SelectItem value="Layer 2">Layer 2</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {filteredNetworks.map((network) => (
                <Card
                  key={network.network}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-accent",
                    walletData.network === network.network && "ring-2 ring-primary bg-accent"
                  )}
                  onClick={() => setWalletData(prev => ({ ...prev, network: network.network }))}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-2">
                      <div className="text-primary">{network.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{network.name}</div>
                        <div className="text-xs text-muted-foreground">{network.description}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {network.category}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedNetwork && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Network Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Native Currency:</span>
                    <span className="ml-1 font-medium">{selectedNetwork.nativeCurrency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confirmation Time:</span>
                    <span className="ml-1 font-medium">{selectedNetwork.estimatedConfirmationTime}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Wallet Configuration</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your wallet settings and metadata
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="wallet-name">Wallet Name *</Label>
                <Input
                  id="wallet-name"
                  placeholder="Enter wallet name (e.g., Main Wallet, Treasury)"
                  value={walletData.name}
                  onChange={(e) => setWalletData(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Choose a descriptive name for easy identification
                </p>
              </div>

              <div>
                <Label htmlFor="external-id">External ID (Optional)</Label>
                <Input
                  id="external-id"
                  placeholder="Enter external reference ID"
                  value={walletData.externalId || ''}
                  onChange={(e) => setWalletData(prev => ({ ...prev, externalId: e.target.value }))}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Optional ID for integration with external systems
                </p>
              </div>

              <div>
                <Label htmlFor="tags">Tags (Optional)</Label>
                <div className="space-y-2">
                  <div className="flex space-x-1">
                    <Input
                      id="tags"
                      placeholder="Add tags (press Enter)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                  {walletData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {walletData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Add tags for organization (press Enter to add)
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Review & Create</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Review your wallet configuration before creation
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-3">Wallet Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network:</span>
                    <div className="flex items-center space-x-1">
                      {selectedNetwork?.icon}
                      <span className="font-medium">{selectedNetwork?.name}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="font-medium">{walletData.name}</span>
                  </div>
                  {walletData.externalId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">External ID:</span>
                      <span className="font-medium">{walletData.externalId}</span>
                    </div>
                  )}
                  {walletData.tags.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tags:</span>
                      <div className="flex flex-wrap gap-1">
                        {walletData.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Important</p>
                    <p className="text-yellow-700 mt-1">
                      Wallet creation requires User Action Signing for security. 
                      You'll be prompted to authenticate with your security key.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Wallet Created Successfully!</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Your {selectedNetwork?.name} wallet "{walletData.name}" has been created
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Create New Wallet</span>
          </DialogTitle>
          <DialogDescription>
            Multi-step wizard to create a wallet on your chosen blockchain network
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress */}
        {!success && (
          <div className="flex items-center justify-between mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                  step <= currentStep 
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground text-muted-foreground"
                )}>
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={cn(
                    "w-20 h-0.5 mx-2",
                    step < currentStep ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-96">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {!success && (
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button onClick={handleNext} disabled={loading}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleCreateWallet} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating Wallet...
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4 mr-2" />
                    Create Wallet
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
