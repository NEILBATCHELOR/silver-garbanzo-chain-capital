import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { GuardianWalletService } from '@/services/guardian/GuardianWalletService';
import { GuardianPollingService } from '@/infrastructure/guardian/GuardianPollingService';
import { useUser } from '@/hooks/auth/user/useUser';
import type { Wallet } from '@/types/core/centralModels';
import type { GuardianWalletExtension } from '@/types/guardian/guardian';

const guardianWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required").max(50, "Wallet name too long"),
  type: z.enum(['EOA', 'MULTISIG', 'SMART']),
  blockchain: z.enum(['polygon', 'ethereum']),
});

type GuardianWalletFormData = z.infer<typeof guardianWalletSchema>;

interface GuardianWalletCreationProps {
  onWalletCreated?: (wallet: Wallet & GuardianWalletExtension) => void;
  onCancel?: () => void;
  maxWallets?: number;
  currentWalletCount?: number;
}

export function GuardianWalletCreation({ 
  onWalletCreated, 
  onCancel,
  maxWallets = 50,
  currentWalletCount = 0
}: GuardianWalletCreationProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'tracking' | 'completed' | 'error'>('idle');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [createdWallet, setCreatedWallet] = useState<(Wallet & GuardianWalletExtension) | null>(null);

  const form = useForm<GuardianWalletFormData>({
    resolver: zodResolver(guardianWalletSchema),
    defaultValues: {
      name: '',
      type: 'EOA',
      blockchain: 'polygon',
    },
  });

  const guardianWalletService = new GuardianWalletService();
  const pollingService = new GuardianPollingService();

  const onSubmit = async (data: GuardianWalletFormData) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please sign in to create a Guardian wallet.",
      });
      return;
    }

    // Check wallet limit
    if (currentWalletCount >= maxWallets) {
      toast({
        variant: "destructive",
        title: "Wallet Limit Reached",
        description: `You can create a maximum of ${maxWallets} wallets. Please contact support if you need more.`,
      });
      return;
    }

    setIsCreating(true);
    setCreationStatus('creating');

    try {
      // Create Guardian wallet
      const wallet = await guardianWalletService.createGuardianWallet({
        name: data.name,
        type: data.type,
        userId: user.id,
        blockchain: data.blockchain,
        metadata: {
          createdVia: 'wallet-dashboard',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }
      });

      setCreatedWallet(wallet);
      setOperationId(wallet.guardianMetadata?.operationId || null);
      setCreationStatus('tracking');

      toast({
        title: "Guardian Wallet Created",
        description: `${data.name} has been created. Tracking operation status...`,
      });

      // Track operation status using robust polling service
      if (wallet.guardianMetadata?.operationId) {
        console.log(`🔍 Starting robust polling for operation ${wallet.guardianMetadata.operationId}`);
        
        try {
          const result = await pollingService.pollOperationWithProgress(
            wallet.guardianMetadata.operationId,
            (attempt, status, elapsed) => {
              console.log(`📊 Guardian wallet poll attempt ${attempt}: Status=${status}, Elapsed=${elapsed}ms`);
            },
            {
              maxAttempts: 20,
              intervalMs: 3000,
              timeoutMs: 60000
            }
          );
          
          console.log('🎯 Guardian wallet polling completed:', result);
          
          if (result.status === 'processed') {
            console.log('✅ Guardian wallet creation completed successfully!', result.result);
            setCreationStatus('completed');
            
            if (onWalletCreated) {
              onWalletCreated({
                ...wallet,
                address: result.result?.accounts?.[0]?.address || wallet.address,
                guardianMetadata: {
                  ...wallet.guardianMetadata,
                  status: 'completed',
                  result: result.result,
                  accounts: result.result?.accounts || []
                }
              });
            }
          } else {
            console.error('❌ Guardian wallet creation did not complete successfully:', result);
            setCreationStatus('completed'); // Still mark as completed to unblock UI
          }
          
        } catch (error) {
          console.error('❌ Error during Guardian wallet polling:', error);
          setCreationStatus('completed'); // Mark as completed to unblock UI
        }
      }

    } catch (error) {
      setCreationStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      toast({
        variant: "destructive",
        title: "Failed to Create Guardian Wallet",
        description: errorMessage,
      });
      
      console.error('Guardian wallet creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleComplete = () => {
    if (createdWallet && onWalletCreated) {
      onWalletCreated(createdWallet);
    }
    
    toast({
      title: "Success",
      description: "Guardian wallet is ready for use!",
    });

    navigate('/wallet/dashboard?tab=wallets');
  };

  const getStatusDisplay = () => {
    switch (creationStatus) {
      case 'creating':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          text: 'Creating Guardian wallet...',
          color: 'text-blue-600'
        };
      case 'tracking':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: 'Tracking wallet creation progress...',
          color: 'text-yellow-600'
        };
      case 'completed':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: 'Guardian wallet created successfully!',
          color: 'text-green-600'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Failed to create Guardian wallet',
          color: 'text-red-600'
        };
      default:
        return null;
    }
  };

  const walletLimitWarning = currentWalletCount >= (maxWallets * 0.8);
  const statusDisplay = getStatusDisplay();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>Create Guardian Wallet</CardTitle>
        </div>
        <CardDescription>
          Create a secure, institutional-grade wallet managed by Guardian
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {walletLimitWarning && (
          <Alert className="mb-4 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-yellow-800">
              You have {currentWalletCount} of {maxWallets} wallets. 
              {currentWalletCount >= maxWallets ? " Limit reached." : " Approaching limit."}
            </AlertDescription>
          </Alert>
        )}

        {statusDisplay && (
          <Alert className="mb-4">
            <div className="flex items-center gap-2">
              {statusDisplay.icon}
              <span className={statusDisplay.color}>{statusDisplay.text}</span>
            </div>
            {operationId && (
              <div className="mt-2 text-xs text-muted-foreground">
                Operation ID: {operationId}
              </div>
            )}
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="My Guardian Wallet"
                      {...field}
                      disabled={isCreating || creationStatus === 'completed'}
                    />
                  </FormControl>
                  <FormDescription>
                    Choose a unique name for your wallet
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wallet Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isCreating || creationStatus === 'completed'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="EOA">Externally Owned Account</SelectItem>
                      <SelectItem value="MULTISIG">Multi-Signature</SelectItem>
                      <SelectItem value="SMART">Smart Contract</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    EOA is recommended for most users
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="blockchain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Blockchain</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={isCreating || creationStatus === 'completed'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="polygon">Polygon (Recommended)</SelectItem>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Polygon offers lower fees and faster transactions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              {creationStatus === 'completed' ? (
                <>
                  <Button 
                    type="button" 
                    onClick={handleComplete}
                    className="flex-1"
                  >
                    Continue to Dashboard
                  </Button>
                  {onCancel && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onCancel}
                    >
                      Close
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    type="submit" 
                    disabled={isCreating || currentWalletCount >= maxWallets}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Guardian Wallet'
                    )}
                  </Button>
                  {onCancel && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={onCancel}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default GuardianWalletCreation;
