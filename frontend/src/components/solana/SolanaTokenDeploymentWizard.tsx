/**
 * Solana Token Deployment Wizard - Part 1/2
 * Main component that orchestrates the token deployment flow
 * Integrates: TokenTypeSelector, BasicTokenConfigForm, ExtensionsSelector, TransferFeeConfig, DeploymentPreview
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Circle, Loader2, ExternalLink } from 'lucide-react';
import { TokenTypeSelector, type SolanaTokenType } from './TokenTypeSelector';
import { BasicTokenConfigForm, type BasicTokenConfig } from './BasicTokenConfigForm';
import { ExtensionsSelector, type Token2022Extension } from './ExtensionsSelector';
import { TransferFeeConfig, type TransferFeeConfiguration } from './TransferFeeConfig';
import { InterestBearingConfig, type InterestBearingConfiguration } from './InterestBearingConfig';
import { DeploymentPreview } from './DeploymentPreview';
import { unifiedSolanaTokenDeploymentService } from '@/components/tokens/services/unifiedSolanaTokenDeploymentService';
import { supabase } from '@/infrastructure/database/client';
import { SolanaWalletSelector, type SelectedSolanaWallet } from './SolanaWalletSelector';
import { useToast } from '@/components/ui/use-toast';

type WizardStep = 
  | 'tokenType'
  | 'basicConfig'
  | 'walletSelection'
  | 'extensions'
  | 'extensionConfig'
  | 'preview'
  | 'deploying'
  | 'complete';

interface WizardState {
  tokenType: SolanaTokenType;
  basicConfig: BasicTokenConfig | null;
  selectedWallet: SelectedSolanaWallet | null;
  extensions: Token2022Extension[];
  transferFeeConfig: TransferFeeConfiguration | null;
  interestBearingConfig: InterestBearingConfiguration | null;
}

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'tokenType', label: 'Token Type', description: 'SPL or Token-2022' },
  { id: 'basicConfig', label: 'Basic Info', description: 'Name, symbol, supply' },
  { id: 'walletSelection', label: 'Funding Wallet', description: 'Select wallet' },
  { id: 'extensions', label: 'Extensions', description: 'Advanced features' },
  { id: 'extensionConfig', label: 'Configure', description: 'Extension settings' },
  { id: 'preview', label: 'Review', description: 'Confirm deployment' }
];

interface SolanaTokenDeploymentWizardProps {
  projectId: string;
  userId?: string;
  network?: 'mainnet-beta' | 'devnet' | 'testnet';
  walletPrivateKey?: string;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

export function SolanaTokenDeploymentWizard({
  projectId,
  userId,
  network = 'devnet',
  walletPrivateKey,
  onComplete,
  onCancel
}: SolanaTokenDeploymentWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>('tokenType');
  const [state, setState] = useState<WizardState>({
    tokenType: 'SPL',
    basicConfig: null,
    selectedWallet: null,
    extensions: [], // Will be auto-populated when Token2022 is selected
    transferFeeConfig: null,
    interestBearingConfig: null
  });
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = currentStep === 'deploying' || currentStep === 'complete' 
    ? 100 
    : ((currentStepIndex + 1) / steps.length) * 100;

  // Determine which steps to show based on token type and extensions
  const getStepSequence = (): WizardStep[] => {
    const sequence: WizardStep[] = ['tokenType', 'basicConfig', 'walletSelection'];
    
    if (state.tokenType === 'Token2022') {
      sequence.push('extensions');
      
      // Show extension config if transfer fee or interest-bearing is selected
      if (state.extensions.includes('TransferFee') || state.extensions.includes('InterestBearing')) {
        sequence.push('extensionConfig');
      }
    }
    
    sequence.push('preview');
    return sequence;
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'tokenType':
        return true;
      case 'basicConfig':
        // Just check if basic fields exist, don't enforce strict validation
        return state.basicConfig !== null && 
               !!state.basicConfig.name && 
               !!state.basicConfig.symbol;
      case 'walletSelection':
        return state.selectedWallet !== null;
      case 'extensions':
        return true; // Can proceed with 0 extensions
      case 'extensionConfig':
        return !state.extensions.includes('TransferFee') || state.transferFeeConfig !== null;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (!canProceed()) return;

    const stepSequence = getStepSequence();
    const currentIndex = stepSequence.indexOf(currentStep);
    
    if (currentIndex < stepSequence.length - 1) {
      setCurrentStep(stepSequence[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepSequence = getStepSequence();
    const currentIndex = stepSequence.indexOf(currentStep);
    
    if (currentIndex > 0) {
      setCurrentStep(stepSequence[currentIndex - 1]);
    }
  };

  const handleDeploy = async () => {
    if (!state.basicConfig) return;
    if (!state.selectedWallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please select a funding wallet',
        variant: 'destructive'
      });
      return;
    }

    setIsDeploying(true);
    setError(null);
    setCurrentStep('deploying');

    let tokenRecordId: string | null = null;

    try {
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('User not authenticated. Please log in to deploy tokens.');
      }
      
      const currentUserId = userId || authUser.id;

      // Step 1: Create token record in database first
      const { data: tokenRecord, error: dbError } = await supabase
        .from('tokens')
        .insert({
          project_id: projectId,
          name: state.basicConfig.name,
          symbol: state.basicConfig.symbol,
          standard: state.tokenType === 'SPL' ? 'SPL' : 'Token2022',
          decimals: state.basicConfig.decimals,
          total_supply: state.basicConfig.initialSupply.toString(),
          blockchain: 'solana',
          deployment_environment: network,
          deployment_status: 'pending', // Mark as pending initially
          status: 'DRAFT', // Initial status is DRAFT
          blocks: {}, // Required field - empty for Solana tokens
          metadata: {
            uri: state.basicConfig.metadataUri || null,
            on_chain_metadata: state.tokenType === 'Token2022' && state.extensions.includes('Metadata'),
            extensions: state.tokenType === 'Token2022' ? state.extensions : [],
            transfer_fee: state.transferFeeConfig ? {
              fee_basis_points: state.transferFeeConfig.feeBasisPoints,
              max_fee: state.transferFeeConfig.maxFee
            } : null,
            interest_bearing: state.interestBearingConfig ? {
              rate: state.interestBearingConfig.rate
            } : null,
            non_transferable: state.extensions.includes('NonTransferable') || false
          }
        })
        .select()
        .single();

      if (dbError || !tokenRecord) {
        console.error('[Deploy] Database error:', dbError);
        throw new Error(dbError ? `Database error: ${dbError.message}` : 'Failed to create token record in database');
      }

      tokenRecordId = tokenRecord.id;

      // Step 2: Deploy token using unified service
      console.log('[Wizard] Calling deploySolanaToken with:');
      console.log('[Wizard] tokenRecord.id:', tokenRecord.id);
      console.log('[Wizard] tokenRecord:', tokenRecord);
      
      const result = await unifiedSolanaTokenDeploymentService.deploySolanaToken(
        tokenRecord.id,
        currentUserId,
        projectId,
        network,
        state.selectedWallet.privateKey
      );

      if (result.success) {
        setDeploymentResult(result);
        setCurrentStep('complete');
        onComplete?.(result);
      } else {
        // Deployment failed - update token status
        await supabase
          .from('tokens')
          .update({
            deployment_status: 'failed',
            deployment_error: result.errors?.join(', ') || 'Deployment failed',
            status: 'FAILED'
          })
          .eq('id', tokenRecord.id);
        
        setError(result.errors?.join(', ') || 'Deployment failed');
        setCurrentStep('preview'); // Go back to preview on error
      }
    } catch (err) {
      console.error('Deployment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      
      // Update token status to failed if we created the record
      if (tokenRecordId) {
        await supabase
          .from('tokens')
          .update({
            deployment_status: 'failed',
            deployment_error: errorMessage,
            status: 'FAILED'
          })
          .eq('id', tokenRecordId);
      }
      
      setError(errorMessage);
      setCurrentStep('preview'); // Go back to preview on error
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Deploy Solana Token</CardTitle>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  {index <= currentStepIndex || currentStep === 'deploying' || currentStep === 'complete' ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs mt-1">{step.label}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className="w-12 h-0.5 bg-muted mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Step Content */}
      {currentStep === 'tokenType' && (
        <TokenTypeSelector
          value={state.tokenType}
          onChange={(tokenType) => {
            // Auto-enable metadata extension for Token-2022 (it's the whole point!)
            const defaultExtensions: Token2022Extension[] = tokenType === 'Token2022' 
              ? ['Metadata' as Token2022Extension, 'MetadataPointer' as Token2022Extension] 
              : [];
            setState({ ...state, tokenType, extensions: defaultExtensions });
          }}
        />
      )}

      {currentStep === 'basicConfig' && (
        <BasicTokenConfigForm
          value={state.basicConfig || {}}
          onChange={(basicConfig) => setState({ ...state, basicConfig })}
        />
      )}

      {currentStep === 'walletSelection' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Funding Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <SolanaWalletSelector
              projectId={projectId}
              network={network}
              onWalletSelected={(wallet) => {
                setState({ ...state, selectedWallet: wallet });
              }}
              onError={(error) => {
                toast({
                  title: 'Wallet Error',
                  description: error,
                  variant: 'destructive'
                });
              }}
              label="Deployment Wallet"
              description="This wallet will fund the token deployment transaction"
              required
              autoSelectFirst
            />
          </CardContent>
        </Card>
      )}

      {currentStep === 'extensions' && (
        <ExtensionsSelector
          selectedExtensions={state.extensions}
          onChange={(extensions) => setState({ ...state, extensions })}
        />
      )}

      {currentStep === 'extensionConfig' && (
        <div className="space-y-6">
          {state.extensions.includes('TransferFee') && (
            <TransferFeeConfig
              value={state.transferFeeConfig || { feeBasisPoints: 100, maxFee: '10000000000' }}
              onChange={(transferFeeConfig) => setState({ ...state, transferFeeConfig })}
            />
          )}
          
          {state.extensions.includes('InterestBearing') && (
            <InterestBearingConfig
              value={state.interestBearingConfig || { rate: 500 }}
              onChange={(interestBearingConfig) => setState({ ...state, interestBearingConfig })}
            />
          )}
        </div>
      )}

      {currentStep === 'preview' && state.basicConfig && (
        <DeploymentPreview
          tokenType={state.tokenType}
          basicConfig={state.basicConfig}
          extensions={state.extensions}
          transferFeeConfig={state.transferFeeConfig}
          interestBearingConfig={state.interestBearingConfig}
          network={network}
        />
      )}

      {currentStep === 'deploying' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Deploying Token...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please wait while your token is being deployed to Solana {network}. This may take up to 30 seconds.
            </p>
          </CardContent>
        </Card>
      )}

      {currentStep === 'complete' && deploymentResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              Deployment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Token Address</p>
                <p className="font-mono text-sm">{deploymentResult.tokenAddress}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transaction Hash</p>
                <p className="font-mono text-sm">{deploymentResult.transactionHash}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Strategy Used</p>
                <p className="text-sm">{deploymentResult.deploymentStrategy}</p>
              </div>
              <div>
                <a 
                  href={`https://explorer.solana.com/address/${deploymentResult.tokenAddress}?cluster=${network}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                >
                  View on Solana Explorer
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {currentStep !== 'complete' && currentStep !== 'deploying' && (
        <div className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'tokenType'}
            >
              Back
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
          {currentStep === 'preview' ? (
            <Button onClick={handleDeploy} disabled={!canProceed()}>
              Deploy Token
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
