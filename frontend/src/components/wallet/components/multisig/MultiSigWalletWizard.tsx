/**
 * Multi-Sig Wallet Creation Wizard
 * Step-by-step wizard for creating multi-signature wallets
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Shield,
  Users,
  Settings,
  Check,
  AlertCircle,
  Plus,
  X,
  Copy,
  Wallet,
  Key,
  ChevronRight,
  CircleCheck,
  ChevronLeft,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ChainType } from '@/services/wallet/AddressUtils';
import { supabase } from '@/infrastructure/database/client';

// ============================================================================
// INTERFACES
// ============================================================================

interface WizardStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface SignerInput {
  id: string;
  address: string;
  name: string;
  isValid: boolean;
}

interface WalletConfig {
  name: string;
  chainType: ChainType;
  network: 'mainnet' | 'testnet';
  walletType: 'safe' | 'custom' | 'native';
  signers: SignerInput[];
  threshold: number;
  dailyLimit?: number;
  requireAllSignatures: boolean;
  autoExecute: boolean;
}

interface MultiSigWalletWizardProps {
  projectId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MultiSigWalletWizard: React.FC<MultiSigWalletWizardProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [creating, setCreating] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdWalletId, setCreatedWalletId] = useState<string>('');
  
  // Form state
  const [config, setConfig] = useState<WalletConfig>({
    name: '',
    chainType: ChainType.ETHEREUM,
    network: 'testnet',
    walletType: 'safe',
    signers: [
      { id: '1', address: '', name: '', isValid: false },
      { id: '2', address: '', name: '', isValid: false },
      { id: '3', address: '', name: '', isValid: false },
    ],
    threshold: 2,
    requireAllSignatures: false,
    autoExecute: true,
  });

  const steps: WizardStep[] = [
    {
      title: 'Basic Configuration',
      description: 'Set up wallet name and network',
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      title: 'Add Signers',
      description: 'Add wallet owners who can sign',
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: 'Set Threshold',
      description: 'Choose signature requirements',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      title: 'Review & Create',
      description: 'Review and deploy wallet',
      icon: <Check className="h-5 w-5" />,
    },
  ];

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        return config.name.length > 0;
      case 1:
        const validSigners = config.signers.filter(s => s.isValid);
        return validSigners.length >= 2;
      case 2:
        return config.threshold >= 1 && 
               config.threshold <= config.signers.filter(s => s.isValid).length;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please complete all required fields",
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const addSigner = () => {
    setConfig({
      ...config,
      signers: [
        ...config.signers,
        { 
          id: Date.now().toString(), 
          address: '', 
          name: '', 
          isValid: false 
        },
      ],
    });
  };

  const removeSigner = (id: string) => {
    const updatedSigners = config.signers.filter(s => s.id !== id);
    setConfig({
      ...config,
      signers: updatedSigners,
      threshold: Math.min(config.threshold, updatedSigners.filter(s => s.isValid).length),
    });
  };

  const updateSigner = (id: string, field: 'address' | 'name', value: string) => {
    const updatedSigners = config.signers.map(s => {
      if (s.id === id) {
        const updated = { ...s, [field]: value };
        // Basic address validation (simplified for demo)
        if (field === 'address') {
          updated.isValid = /^0x[a-fA-F0-9]{40}$/.test(value);
        }
        return updated;
      }
      return s;
    });
    setConfig({ ...config, signers: updatedSigners });
  };

  const handleCreate = async () => {
    try {
      setCreating(true);
      
      // Validate final configuration
      if (!validateStep(currentStep)) {
        throw new Error('Invalid configuration');
      }

      // Validate project ID is provided
      if (!projectId) {
        throw new Error('Project ID is required to create a multi-sig wallet');
      }
      
      const validSigners = config.signers.filter(s => s.isValid);
      
      // Create wallet in database
      const { data: wallet, error } = await supabase
        .from('multi_sig_wallets')
        .insert({
          name: config.name,
          blockchain: config.chainType,
          network: config.network,
          wallet_type: config.walletType,
          owners: validSigners.map(s => s.address),
          threshold: config.threshold,
          status: 'active',
          project_id: projectId,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Create configuration
      await supabase
        .from('multi_sig_configurations')
        .insert({
          wallet_id: wallet.id,
          max_daily_limit: config.dailyLimit,
          require_all_signatures: config.requireAllSignatures,
          auto_execute: config.autoExecute,
          metadata: {
            signerNames: validSigners.reduce((acc, s) => ({
              ...acc,
              [s.address]: s.name,
            }), {}),
          },
        });
      
      setCreatedWalletId(wallet.id);
      setShowSuccessDialog(true);
      
      toast({
        title: "Wallet Created",
        description: "Your multi-sig wallet has been successfully created",
      });
    } catch (error) {
      console.error('Failed to create wallet:', error);
      toast({
        variant: "destructive",
        title: "Failed to create wallet",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Wallet ID copied to clipboard",
    });
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Wallet Name</Label>
              <Input
                id="name"
                placeholder="e.g., Treasury Wallet"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Choose a descriptive name for your multi-sig wallet
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="chain">Blockchain</Label>
              <Select 
                value={config.chainType} 
                onValueChange={(value) => setConfig({ ...config, chainType: value as ChainType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ChainType.ETHEREUM}>Ethereum</SelectItem>
                  <SelectItem value={ChainType.POLYGON}>Polygon</SelectItem>
                  <SelectItem value={ChainType.ARBITRUM}>Arbitrum</SelectItem>
                  <SelectItem value={ChainType.OPTIMISM}>Optimism</SelectItem>
                  <SelectItem value={ChainType.BASE}>Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Network</Label>
              <RadioGroup 
                value={config.network}
                onValueChange={(value) => setConfig({ ...config, network: value as 'mainnet' | 'testnet' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="testnet" id="testnet" />
                  <Label htmlFor="testnet">Testnet (Recommended for testing)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mainnet" id="mainnet" />
                  <Label htmlFor="mainnet">Mainnet</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Wallet Type</Label>
              <RadioGroup 
                value={config.walletType}
                onValueChange={(value) => setConfig({ ...config, walletType: value as 'safe' | 'custom' | 'native' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="safe" id="safe" />
                  <Label htmlFor="safe">Safe (Gnosis Safe compatible)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom">Custom Smart Contract</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="native" id="native" />
                  <Label htmlFor="native">Native Multi-sig</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Label>Wallet Signers</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addSigner}
                disabled={config.signers.length >= 10}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Signer
              </Button>
            </div>
            
            <div className="space-y-4">
              {config.signers.map((signer, index) => (
                <Card key={signer.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Signer {index + 1}</Label>
                        {config.signers.length > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSigner(signer.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <Input
                        placeholder="Signer name (optional)"
                        value={signer.name}
                        onChange={(e) => updateSigner(signer.id, 'name', e.target.value)}
                      />
                      
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="0x..."
                          value={signer.address}
                          onChange={(e) => updateSigner(signer.id, 'address', e.target.value)}
                        />
                        {signer.isValid ? (
                          <CircleCheck className="h-5 w-5 text-green-500" />
                        ) : signer.address ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Important</AlertTitle>
              <AlertDescription>
                Add at least 2 valid wallet addresses. These addresses will be able to sign transactions.
              </AlertDescription>
            </Alert>
          </div>
        );
      
      case 2:
        const validSignerCount = config.signers.filter(s => s.isValid).length;
        
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Signature Threshold</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[config.threshold]}
                    onValueChange={(value) => setConfig({ ...config, threshold: value[0] })}
                    min={1}
                    max={validSignerCount}
                    step={1}
                    className="flex-1"
                  />
                  <div className="text-xl font-bold w-12 text-center">
                    {config.threshold}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {config.threshold} out of {validSignerCount} signatures required to execute transactions
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Daily Limit (Optional)</Label>
                    <p className="text-xs text-muted-foreground">
                      Maximum value that can be transferred per day
                    </p>
                  </div>
                  <Input
                    type="number"
                    placeholder="0"
                    className="w-32"
                    value={config.dailyLimit || ''}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      dailyLimit: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require All Signatures</Label>
                    <p className="text-xs text-muted-foreground">
                      Override threshold and require all owners to sign
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.requireAllSignatures}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      requireAllSignatures: e.target.checked 
                    })}
                    className="h-4 w-4"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Execute</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically execute when threshold is met
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoExecute}
                    onChange={(e) => setConfig({ 
                      ...config, 
                      autoExecute: e.target.checked 
                    })}
                    className="h-4 w-4"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      
      case 3:
        const finalValidSigners = config.signers.filter(s => s.isValid);
        
        return (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Review Configuration</AlertTitle>
              <AlertDescription>
                Please review your multi-sig wallet configuration before creating
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Basic Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Name:</span>
                    <span className="text-sm font-medium">{config.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Chain:</span>
                    <Badge variant="outline">{config.chainType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Network:</span>
                    <Badge variant={config.network === 'testnet' ? 'secondary' : 'default'}>
                      {config.network}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Type:</span>
                    <span className="text-sm font-medium">{config.walletType}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Signers</h4>
                <div className="space-y-2">
                  {finalValidSigners.map((signer, index) => (
                    <div key={signer.id} className="flex items-center justify-between text-sm">
                      <span>{signer.name || `Signer ${index + 1}`}</span>
                      <code className="text-xs">
                        {signer.address.substring(0, 6)}...{signer.address.slice(-4)}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Settings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Threshold:</span>
                    <span className="text-sm font-medium">
                      {config.threshold} of {finalValidSigners.length}
                    </span>
                  </div>
                  {config.dailyLimit && (
                    <div className="flex justify-between">
                      <span className="text-sm">Daily Limit:</span>
                      <span className="text-sm font-medium">{config.dailyLimit}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-sm">Auto-Execute:</span>
                    <span className="text-sm font-medium">
                      {config.autoExecute ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <>
      {/* Warning when no project is selected */}
      {!projectId && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Project Selected</AlertTitle>
          <AlertDescription>
            Please select a project from the dropdown at the top right before creating a multi-sig wallet. 
            All wallets must be associated with a project.
          </AlertDescription>
        </Alert>
      )}
      
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create Multi-Sig Wallet</CardTitle>
          <CardDescription>
            Set up a new multi-signature wallet with customizable security settings
            {projectId && (
              <span className="block mt-1 text-xs">
                <Badge variant="outline" className="mr-1">Project</Badge>
                Creating wallet for selected project
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  index < currentStep ? 'bg-primary border-primary text-primary-foreground' :
                  index === currentStep ? 'border-primary text-primary' :
                  'border-muted text-muted-foreground'
                }`}>
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.icon
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          {/* Step Content */}
          <div>
            <h3 className="text-lg font-medium mb-2">{steps[currentStep].title}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {steps[currentStep].description}
            </p>
            {renderStepContent()}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || !projectId}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          {currentStep === steps.length - 1 ? (
            <Button onClick={handleCreate} disabled={creating || !projectId}>
              {creating ? "Creating..." : !projectId ? "Select Project First" : "Create Wallet"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!projectId}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Created Successfully!</DialogTitle>
            <DialogDescription>
              Your multi-signature wallet has been created and is ready to use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CircleCheck className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Wallet ID</p>
              <div className="flex items-center justify-center gap-2">
                <code className="text-sm font-mono">
                  {createdWalletId}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(createdWalletId)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Next Steps</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside text-sm space-y-1 mt-2">
                  <li>Fund your multi-sig wallet with assets</li>
                  <li>Share the wallet ID with other signers</li>
                  <li>Create your first transaction proposal</li>
                </ol>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MultiSigWalletWizard;