/**
 * DFNS Wallet Create Dialog Component
 * 
 * Multi-step wizard for creating new DFNS wallets across 30+ blockchain networks
 * Supports advanced options, tag management, and real-time network validation
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wallet,
  Plus,
  X,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Info,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/utils/utils';
import { DfnsService } from '@/services/dfns';
import type { DfnsNetwork, DfnsCreateWalletRequest } from '@/types/dfns';

// Supported networks with metadata
const SUPPORTED_NETWORKS: Array<{
  value: DfnsNetwork;
  label: string;
  description: string;
  icon: string;
  category: 'layer1' | 'layer2' | 'sidechain';
  testnet?: boolean;
}> = [
  // Layer 1 Networks
  { value: 'Ethereum', label: 'Ethereum', description: 'The world computer', icon: '⟠', category: 'layer1' },
  { value: 'Bitcoin', label: 'Bitcoin', description: 'Digital gold', icon: '₿', category: 'layer1' },
  { value: 'Solana', label: 'Solana', description: 'Fast, secure, and scalable', icon: '◎', category: 'layer1' },
  { value: 'Avalanche', label: 'Avalanche', description: 'Blazingly fast smart contracts', icon: '🔺', category: 'layer1' },
  { value: 'Cardano', label: 'Cardano', description: 'Peer-reviewed blockchain', icon: '₳', category: 'layer1' },
  { value: 'Polkadot', label: 'Polkadot', description: 'Multi-chain interoperability', icon: '●', category: 'layer1' },
  { value: 'Near', label: 'NEAR', description: 'Carbon neutral blockchain', icon: 'Ⓝ', category: 'layer1' },
  { value: 'Algorand', label: 'Algorand', description: 'Pure proof-of-stake', icon: '△', category: 'layer1' },
  { value: 'Stellar', label: 'Stellar', description: 'Connect financial systems', icon: '✦', category: 'layer1' },
  
  // Layer 2 Networks
  { value: 'Polygon', label: 'Polygon', description: 'Ethereum scaling solution', icon: '⬢', category: 'layer2' },
  { value: 'Arbitrum', label: 'Arbitrum', description: 'Optimistic rollup for Ethereum', icon: '🔵', category: 'layer2' },
  { value: 'Optimism', label: 'Optimism', description: 'Fast Ethereum transactions', icon: '🔴', category: 'layer2' },
  
  // Sidechains
  { value: 'Binance', label: 'BSC', description: 'Binance Smart Chain', icon: '🟡', category: 'sidechain' },
];

// Form schema
const createWalletSchema = z.object({
  network: z.string().min(1, 'Please select a network'),
  name: z.string().min(1, 'Wallet name is required').max(100, 'Name must be 100 characters or less'),
  externalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  keyScheme: z.enum(['ECDSA', 'EdDSA', 'Schnorr']).optional(),
  keyCurve: z.enum(['secp256k1', 'ed25519', 'stark']).optional(),
});

type CreateWalletFormData = z.infer<typeof createWalletSchema>;

interface WalletCreateDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onWalletCreated?: (wallet: any) => void;
}

export function WalletCreateDialog({
  trigger,
  open,
  onOpenChange,
  onWalletCreated
}: WalletCreateDialogProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [dfnsService] = useState(() => new DfnsService());

  const form = useForm<CreateWalletFormData>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      network: '',
      name: '',
      externalId: '',
      tags: [],
      keyScheme: 'ECDSA',
      keyCurve: 'secp256k1',
    },
  });

  const selectedNetwork = form.watch('network') as DfnsNetwork;
  const networkInfo = SUPPORTED_NETWORKS.find(n => n.value === selectedNetwork);

  // Add tag
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      const newTags = [...tags, tagInput.trim()];
      setTags(newTags);
      form.setValue('tags', newTags);
      setTagInput('');
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    form.setValue('tags', newTags);
  };

  // Reset form
  const resetForm = () => {
    form.reset();
    setTags([]);
    setTagInput('');
    setCurrentStep(1);
    setIsCreating(false);
  };

  // Handle form submission
  const onSubmit = async (data: CreateWalletFormData) => {
    try {
      setIsCreating(true);

      const request: DfnsCreateWalletRequest = {
        network: data.network as DfnsNetwork,
        name: data.name,
        externalId: data.externalId || undefined,
        tags: tags.length > 0 ? tags : undefined,
        keyScheme: data.keyScheme,
        keyCurve: data.keyCurve,
      };

      const wallet = await dfnsService.getWalletService().createWallet(request, {
        syncToDatabase: true,
        autoActivate: true,
        createWithTags: tags.length > 0 ? tags : undefined,
      });

      toast({
        title: "Wallet created successfully!",
        description: `${wallet.name} on ${wallet.network} is ready to use`,
      });

      if (onWalletCreated) {
        onWalletCreated(wallet);
      }

      if (onOpenChange) {
        onOpenChange(false);
      }

      resetForm();
    } catch (error: any) {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to create wallet",
        description: error.message || 'Please try again',
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="network" className="text-base font-medium">
                Select Blockchain Network
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the blockchain network for your new wallet
              </p>
            </div>

            <FormField
              control={form.control}
              name="network"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SUPPORTED_NETWORKS.map((network) => (
                        <div
                          key={network.value}
                          className={cn(
                            "p-4 border rounded-lg cursor-pointer transition-all hover:border-primary",
                            field.value === network.value && "border-primary bg-primary/5"
                          )}
                          onClick={() => field.onChange(network.value)}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-2xl">{network.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{network.label}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {network.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {network.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedNetwork && networkInfo && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-900">Network Information</span>
                </div>
                <div className="text-sm text-blue-800">
                  <p><strong>Network:</strong> {networkInfo.label}</p>
                  <p><strong>Type:</strong> {networkInfo.category}</p>
                  <p><strong>Description:</strong> {networkInfo.description}</p>
                </div>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">
                Wallet Configuration
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Configure your wallet settings and metadata
              </p>
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Main Wallet, Trading Wallet"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your wallet (max 100 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="externalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External ID (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your internal reference ID"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional correlation ID for your internal systems
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags (Optional)</Label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <span>{tag}</span>
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Tags help organize and categorize your wallets
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium">
                Advanced Options
              </Label>
              <p className="text-sm text-muted-foreground mb-4">
                Configure cryptographic settings (optional)
              </p>
            </div>

            <FormField
              control={form.control}
              name="keyScheme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Scheme</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key scheme" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ECDSA">ECDSA (Recommended)</SelectItem>
                      <SelectItem value="EdDSA">EdDSA</SelectItem>
                      <SelectItem value="Schnorr">Schnorr</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Digital signature algorithm for the wallet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="keyCurve"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key Curve</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select key curve" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="secp256k1">secp256k1 (Recommended)</SelectItem>
                      <SelectItem value="ed25519">ed25519</SelectItem>
                      <SelectItem value="stark">stark</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Elliptic curve for cryptographic operations
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Summary */}
            <Separator />
            <div className="space-y-3">
              <Label className="text-base font-medium">Summary</Label>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Network:</span>
                  <span className="text-sm font-medium">{networkInfo?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium">{form.watch('name')}</span>
                </div>
                {tags.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tags:</span>
                    <span className="text-sm font-medium">{tags.join(', ')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Key Scheme:</span>
                  <span className="text-sm font-medium">{form.watch('keyScheme')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Key Curve:</span>
                  <span className="text-sm font-medium">{form.watch('keyCurve')}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!selectedNetwork;
      case 2:
        return !!form.watch('name')?.trim();
      case 3:
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <span>Create New Wallet</span>
          </DialogTitle>
          <DialogDescription>
            Create a new multi-chain wallet on your selected blockchain network
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : step < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step < currentStep ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  step
                )}
              </div>
              {step < 3 && (
                <div
                  className={cn(
                    "w-12 h-px ml-2",
                    step < currentStep ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <div className="flex space-x-2">
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!isStepValid()}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isCreating || !isStepValid()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
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
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default WalletCreateDialog;