import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { GuardianApiClient } from '@/infrastructure/guardian/GuardianApiClient';
import { GuardianPollingService } from '@/infrastructure/guardian/GuardianPollingService';
import { GuardianWalletService } from '@/services/guardian/GuardianWalletService';
import { useUser } from '@/hooks/auth/user/useUser';
import type { Wallet } from '@/types/core/centralModels';
import type { GuardianWalletExtension } from '@/types/guardian/guardian';

const simplifiedGuardianWalletSchema = z.object({
  name: z.string().min(1, "Wallet name is required").max(50, "Wallet name too long"),
});

type SimplifiedGuardianWalletFormData = z.infer<typeof simplifiedGuardianWalletSchema>;

interface SimplifiedGuardianWalletCreationProps {
  onWalletCreated?: (wallet: Wallet & GuardianWalletExtension) => void;
  onCancel?: () => void;
  maxWallets?: number;
  currentWalletCount?: number;
}

export function SimplifiedGuardianWalletCreation({ 
  onWalletCreated, 
  onCancel,
  maxWallets = 50,
  currentWalletCount = 0
}: SimplifiedGuardianWalletCreationProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [creationStatus, setCreationStatus] = useState<'idle' | 'creating' | 'tracking' | 'completed' | 'error'>('idle');
  const [operationId, setOperationId] = useState<string | null>(null);
  const [createdWallet, setCreatedWallet] = useState<(Wallet & GuardianWalletExtension) | null>(null);

  const form = useForm<SimplifiedGuardianWalletFormData>({
    resolver: zodResolver(simplifiedGuardianWalletSchema),
    defaultValues: {
      name: '',
    },
  });

  const apiClient = new GuardianApiClient();
  const pollingService = new GuardianPollingService();
  const guardianWalletService = new GuardianWalletService();

  const onSubmit = async (data: SimplifiedGuardianWalletFormData) => {
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
      // Generate wallet ID like in the test page
      const walletId = crypto.randomUUID();
      
      // Call Guardian API directly like in test page
      const apiResponse = await apiClient.createWallet({ id: walletId });
      setOperationId(apiResponse.operationId);
      
      // Create local wallet record with simplified parameters
      const wallet = await guardianWalletService.createGuardianWallet({
        name: data.name,
        type: 'EOA', // Default type
        userId: user.id,
        blockchain: 'polygon', // Default blockchain
        metadata: {
          createdVia: 'wallet-dashboard-simplified',
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          guardianId: walletId,
          operationId: apiResponse.operationId,
        }
      });

      setCreatedWallet(wallet);
      setCreationStatus('tracking');

      toast({
        title: "Guardian Wallet Created",
        description: `${data.name} has been created. Tracking operation status...`,
      });

      // Track operation status using robust polling service
      console.log(`🔍 Starting robust polling for operation ${apiResponse.operationId}`);
      
      try {
        const result = await pollingService.pollOperationWithProgress(
          apiResponse.operationId,
          (attempt, status, elapsed) => {
            console.log(`📊 Wallet creation poll attempt ${attempt}: Status=${status}, Elapsed=${elapsed}ms`);
          },
          {
            maxAttempts: 20,
            intervalMs: 3000,
            timeoutMs: 60000
          }
        );
        
        console.log('🎯 Wallet creation polling completed:', result);
        
        if (result.status === 'processed') {
          console.log('✅ Wallet creation completed successfully!', result.result);
          
          // Update wallet with final details from the operation result
          const updatedWallet = {
            ...wallet,
            address: result.result?.accounts?.[0]?.address || wallet.address,
            guardianMetadata: {
              ...wallet.guardianMetadata,
              status: 'completed',
              result: result.result,
              accounts: result.result?.accounts || []
            }
          };
          
          setCreatedWallet(updatedWallet);
          setCreationStatus('completed');
          
          if (onWalletCreated) {
            onWalletCreated(updatedWallet);
          }
        } else {
          console.error('❌ Wallet creation did not complete successfully:', result);
          setCreationStatus('error');
        }
        
      } catch (error) {
        console.error('❌ Error during wallet creation polling:', error);
        setCreationStatus('error');
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

    // Close dialog
    if (onCancel) {
      onCancel();
    }
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

            <div className="flex gap-2 pt-4">
              {creationStatus === 'completed' ? (
                <>
                  <Button 
                    type="button" 
                    onClick={handleComplete}
                    className="flex-1"
                  >
                    Continue
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
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Create Guardian Wallet
                      </>
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

export default SimplifiedGuardianWalletCreation;