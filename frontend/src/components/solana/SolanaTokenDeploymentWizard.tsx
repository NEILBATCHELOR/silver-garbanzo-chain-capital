/**
 * Solana Token Deployment Wizard - Enhanced with Metadata Integration
 * Main component that orchestrates the token deployment flow
 * Integrates: TokenTypeSelector, BasicTokenConfigForm, ExtensionsSelector, MetadataWizards, DeploymentPreview
 * 
 * NEW: Universal Structured Product Framework Integration
 * - Step 6: Metadata Type Selection (none/enumeration/universal)
 * - Step 7: Metadata Configuration (conditional)
 * - Enhanced deployment with on-chain metadata
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
import { MetadataTypeSelector, type MetadataApproach } from './metadata/MetadataTypeSelector';
import { AssetMetadataWizard } from './metadata/AssetMetadataWizard';
import { UniversalProductWizard } from './metadata/universal/UniversalProductWizard';
import { unifiedSolanaTokenDeploymentService } from '@/components/tokens/services/unifiedSolanaTokenDeploymentService';
import { supabase } from '@/infrastructure/database/client';
import { SolanaWalletSelector, type SelectedSolanaWallet } from './SolanaWalletSelector';
import { useToast } from '@/components/ui/use-toast';
import type { OnChainMetadataResult } from '@/services/tokens/metadata/OnChainMetadataTypes';
import type { UniversalStructuredProductMetadata } from '@/services/tokens/metadata/universal/UniversalStructuredProductTypes';
import { TokenMetadataService } from '@/services/tokens/metadata/TokenMetadataService';

type WizardStep = 
  | 'tokenType'
  | 'basicConfig'
  | 'walletSelection'
  | 'extensions'
  | 'extensionConfig'
  | 'metadataType'      // NEW
  | 'metadataConfig'    // NEW
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
  // NEW: Metadata fields
  metadataApproach?: MetadataApproach;
  enumerationMetadata?: OnChainMetadataResult;
  universalMetadata?: UniversalStructuredProductMetadata;
}

const steps: { id: WizardStep; label: string; description: string }[] = [
  { id: 'tokenType', label: 'Token Type', description: 'SPL or Token-2022' },
  { id: 'basicConfig', label: 'Basic Info', description: 'Name, symbol, supply' },
  { id: 'walletSelection', label: 'Funding Wallet', description: 'Select wallet' },
  { id: 'extensions', label: 'Extensions', description: 'Advanced features' },
  { id: 'extensionConfig', label: 'Configure', description: 'Extension settings' },
  { id: 'metadataType', label: 'Metadata Type', description: 'Choose approach' },
  { id: 'metadataConfig', label: 'Metadata', description: 'Configure metadata' },
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
    extensions: [],
    transferFeeConfig: null,
    interestBearingConfig: null,
    metadataApproach: undefined,
    enumerationMetadata: undefined,
    universalMetadata: undefined
  });
  const [deploymentResult, setDeploymentResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = currentStep === 'deploying' || currentStep === 'complete' 
    ? 100 
    : ((currentStepIndex + 1) / steps.length) * 100;

  // =========================================================================
  // STEP SEQUENCE LOGIC
  // =========================================================================

  /**
   * Determine which steps to show based on token type, extensions, and metadata choice
   */
  const getStepSequence = (): WizardStep[] => {
    const sequence: WizardStep[] = ['tokenType', 'basicConfig', 'walletSelection'];
    
    // Token-2022 specific steps
    if (state.tokenType === 'Token2022') {
      sequence.push('extensions');
      
      // Show extension config if transfer fee or interest-bearing is selected
      if (state.extensions.includes('TransferFee') || state.extensions.includes('InterestBearing')) {
        sequence.push('extensionConfig');
      }

      // Show metadata steps if Metadata extension is enabled
      if (state.extensions.includes('Metadata')) {
        sequence.push('metadataType');
        
        // Only show metadata config if user chose enumeration or universal
        if (state.metadataApproach && state.metadataApproach !== 'none') {
          sequence.push('metadataConfig');
        }
      }
    }
    
    sequence.push('preview');
    return sequence;
  };

  // =========================================================================
  // VALIDATION LOGIC
  // =========================================================================

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'tokenType':
        return true;
      case 'basicConfig':
        return state.basicConfig !== null && 
               !!state.basicConfig.name && 
               !!state.basicConfig.symbol;
      case 'walletSelection':
        return state.selectedWallet !== null;
      case 'extensions':
        return true; // Can proceed with 0 extensions
      case 'extensionConfig':
        return !state.extensions.includes('TransferFee') || state.transferFeeConfig !== null;
      case 'metadataType':
        return !!state.metadataApproach;
      case 'metadataConfig':
        // Can proceed if metadata has been configured
        return (state.metadataApproach === 'enumeration' && !!state.enumerationMetadata) ||
               (state.metadataApproach === 'universal' && !!state.universalMetadata);
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  // =========================================================================
  // NAVIGATION
  // =========================================================================

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

  // =========================================================================
  // METADATA HANDLERS
  // =========================================================================

  const handleMetadataTypeChange = (approach: MetadataApproach) => {
    setState(prev => ({
      ...prev,
      metadataApproach: approach,
      enumerationMetadata: undefined,
      universalMetadata: undefined
    }));

    // Auto-advance if "none" is selected
    if (approach === 'none') {
      handleNext();
    }
  };

  const handleEnumerationComplete = (metadata: OnChainMetadataResult) => {
    setState(prev => ({ ...prev, enumerationMetadata: metadata }));
    handleNext();
  };

  const handleUniversalComplete = (metadata: UniversalStructuredProductMetadata) => {
    setState(prev => ({ ...prev, universalMetadata: metadata }));
    handleNext();
  };

  // =========================================================================
  // HELPER FUNCTIONS
  // =========================================================================

  /**
   * Convert enumeration metadata (OnChainMetadataResult) to Map<string, string>
   * for Token-2022 deployment
   */
  const convertEnumerationToMap = (metadata: OnChainMetadataResult): Map<string, string> => {
    return metadata.additionalMetadata;
  };

  /**
   * Convert universal metadata to Map<string, string> for Token-2022 deployment
   * Uses the universal metadata builder's output format
   */
  const convertUniversalToMap = (metadata: UniversalStructuredProductMetadata): Map<string, string> => {
    // Import the builder (this will be done at top of file in production)
    // For now, we'll construct the map manually based on the metadata structure
    const map = new Map<string, string>();
    
    // Add core fields
    map.set('assetClass', metadata.assetClass);
    map.set('productCategory', metadata.productCategory);
    map.set('productSubtype', metadata.productSubtype);
    
    // Add underlyings (simplified - store as JSON string)
    if (metadata.underlyings && metadata.underlyings.length > 0) {
      map.set('underlyings', JSON.stringify(metadata.underlyings));
    }
    
    // Add components if present
    if (metadata.barriers) {
      map.set('barriers', JSON.stringify(metadata.barriers));
    }
    
    if (metadata.coupons) {
      map.set('coupons', JSON.stringify(metadata.coupons));
    }
    
    // Add observation and settlement
    map.set('observation', JSON.stringify(metadata.observation));
    map.set('settlement', JSON.stringify(metadata.settlement));
    
    // Add base metadata
    map.set('decimals', metadata.decimals);
    map.set('currency', metadata.currency);
    map.set('issuer', metadata.issuer);
    map.set('jurisdiction', metadata.jurisdiction);
    map.set('issueDate', metadata.issueDate);
    
    // Note: uri is not part of UniversalStructuredProductMetadata
    // It will be provided separately when deploying
    
    return map;
  };

  /**
   * Validate metadata size (must be < 1KB)
   */
  const validateMetadataSize = (metadata: Map<string, string>): { valid: boolean; size: number; maxSize: number } => {
    let totalSize = 0;
    
    metadata.forEach((value, key) => {
      totalSize += key.length + value.length;
    });
    
    return {
      valid: totalSize <= 1024,
      size: totalSize,
      maxSize: 1024
    };
  };

  /**
   * Display metadata summary in preview
   */
  const getMetadataSummary = (): { approach: string; itemCount: number; size: number } | null => {
    if (!state.metadataApproach || state.metadataApproach === 'none') {
      return null;
    }
    
    if (state.metadataApproach === 'enumeration' && state.enumerationMetadata) {
      const size = state.enumerationMetadata.validation.estimatedSize;
      return {
        approach: 'Quick Setup (Enumeration)',
        itemCount: state.enumerationMetadata.additionalMetadata.size,
        size
      };
    }
    
    if (state.metadataApproach === 'universal' && state.universalMetadata) {
      const map = convertUniversalToMap(state.universalMetadata);
      const validation = validateMetadataSize(map);
      return {
        approach: 'Custom Build (Universal)',
        itemCount: map.size,
        size: validation.size
      };
    }
    
    return null;
  };

  // =========================================================================
  // DEPLOYMENT
  // =========================================================================

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
    let metadataRecordId: string | null = null;

    try {
      // Get current authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        throw new Error('User not authenticated. Please log in to deploy tokens.');
      }
      
      const currentUserId = userId || authUser.id;

      // ========================================================================
      // STEP 1: SAVE METADATA TO token_metadata TABLE (NEW INTEGRATED FLOW)
      // ========================================================================
      
      let metadataForToken: {
        name: string;
        symbol: string;
        uri: string;
        additionalMetadata?: Map<string, string>;
      } | undefined;

      // Build metadata and save to token_metadata table if metadata is configured
      if (state.metadataApproach === 'enumeration' && state.enumerationMetadata) {
        console.log('[Wizard] Processing enumeration metadata...');
        
        // Extract asset class and instrument type from enumeration metadata
        const metadataMap = state.enumerationMetadata.additionalMetadata;
        const assetClass = metadataMap.get('assetClass') || 'structured_product';
        const instrumentType = metadataMap.get('instrumentType') || 'autocallable';
        
        // Convert to metadata input with name/symbol/uri from basicConfig
        const enumerationData = Object.fromEntries(metadataMap);
        const metadataInput = TokenMetadataService.createMetadataFromEnumeration(
          {
            ...enumerationData,
            name: state.basicConfig.name,
            symbol: state.basicConfig.symbol,
            uri: state.basicConfig.metadataUri || '',
            metadata_uri: state.basicConfig.metadataUri || ''
          },
          assetClass,
          instrumentType,
          projectId
        );
        
        // Save to token_metadata table
        console.log('[Wizard] Saving enumeration metadata to database...');
        const metadataResult = await TokenMetadataService.saveMetadata(metadataInput);
        
        if (!metadataResult.success) {
          throw new Error(`Failed to save metadata: ${metadataResult.error}`);
        }
        
        metadataRecordId = metadataResult.data!.id;
        console.log('[Wizard] ✅ Metadata saved with ID:', metadataRecordId);
        
        // Also build for Token-2022 on-chain metadata
        const additionalMetadata = convertEnumerationToMap(state.enumerationMetadata);
        const validation = validateMetadataSize(additionalMetadata);
        if (!validation.valid) {
          throw new Error(
            `Metadata too large: ${validation.size} bytes (max ${validation.maxSize} bytes)`
          );
        }
        
        metadataForToken = {
          name: state.basicConfig.name,
          symbol: state.basicConfig.symbol,
          uri: state.basicConfig.metadataUri || '',
          additionalMetadata
        };
        
      } else if (state.metadataApproach === 'universal' && state.universalMetadata) {
        console.log('[Wizard] Processing universal metadata...');
        
        // Convert to metadata input with name/symbol/uri from basicConfig
        const metadataInput = TokenMetadataService.createMetadataFromUniversal(
          {
            ...state.universalMetadata,
            name: state.basicConfig.name,
            symbol: state.basicConfig.symbol,
            uri: state.basicConfig.metadataUri || '',
            prospectusUri: state.universalMetadata.prospectusUri || state.basicConfig.metadataUri
          },
          projectId
        );
        
        // Save to token_metadata table
        console.log('[Wizard] Saving universal metadata to database...');
        const metadataResult = await TokenMetadataService.saveMetadata(metadataInput);
        
        if (!metadataResult.success) {
          throw new Error(`Failed to save metadata: ${metadataResult.error}`);
        }
        
        metadataRecordId = metadataResult.data!.id;
        console.log('[Wizard] ✅ Metadata saved with ID:', metadataRecordId);
        
        // Also build for Token-2022 on-chain metadata
        const additionalMetadata = convertUniversalToMap(state.universalMetadata);
        const validation = validateMetadataSize(additionalMetadata);
        if (!validation.valid) {
          throw new Error(
            `Metadata too large: ${validation.size} bytes (max ${validation.maxSize} bytes)`
          );
        }
        
        metadataForToken = {
          name: state.basicConfig.name,
          symbol: state.basicConfig.symbol,
          uri: state.universalMetadata.prospectusUri || state.basicConfig.metadataUri || '',
          additionalMetadata
        };
      }

      // ========================================================================
      // STEP 2: CREATE TOKEN RECORD IN tokens TABLE
      // ========================================================================

      console.log('[Wizard] Creating token record...');
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
          deployment_status: 'pending',
          status: 'DRAFT',
          blocks: {},
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
            non_transferable: state.extensions.includes('NonTransferable') || false,
            // Store metadata approach and reference to token_metadata record
            metadata_approach: state.metadataApproach,
            metadata_record_id: metadataRecordId, // Link to token_metadata table
            metadata_summary: getMetadataSummary(),
            // Store actual metadata for Token-2022 on-chain
            additional_metadata: metadataForToken?.additionalMetadata 
              ? Object.fromEntries(metadataForToken.additionalMetadata)
              : null
          }
        })
        .select()
        .single();

      if (dbError || !tokenRecord) {
        console.error('[Deploy] Database error:', dbError);
        throw new Error(dbError ? `Database error: ${dbError.message}` : 'Failed to create token record in database');
      }

      tokenRecordId = tokenRecord.id;
      console.log('[Wizard] ✅ Token record created with ID:', tokenRecordId);

      // ========================================================================
      // STEP 3: LINK METADATA TO TOKEN (if metadata was saved)
      // ========================================================================
      
      if (metadataRecordId) {
        console.log('[Wizard] Linking metadata to token...');
        const linkResult = await TokenMetadataService.linkToDeployedToken(
          metadataRecordId,
          tokenRecordId
        );
        
        if (linkResult.success) {
          console.log('[Wizard] ✅ Metadata linked to token');
        } else {
          console.warn('[Wizard] ⚠️ Warning: Failed to link metadata:', linkResult.error);
          // Don't fail deployment, just log warning
        }
      }

      // ========================================================================
      // DEPLOY TOKEN USING UNIFIED SERVICE
      // ========================================================================
      
      console.log('[Wizard] Calling deploySolanaToken with:');
      console.log('[Wizard] tokenRecord.id:', tokenRecord.id);
      console.log('[Wizard] Metadata enabled:', !!metadataForToken);
      if (metadataForToken) {
        console.log('[Wizard] Metadata fields:', metadataForToken.additionalMetadata?.size || 0);
      }
      
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
        setCurrentStep('preview');
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
      setCurrentStep('preview');
    } finally {
      setIsDeploying(false);
    }
  };

  // =========================================================================
  // RENDER
  // =========================================================================

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
            {steps.slice(0, 8).map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  {index <= currentStepIndex || currentStep === 'deploying' || currentStep === 'complete' ? (
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground" />
                  )}
                  <span className="text-xs mt-1">{step.label}</span>
                </div>
                {index < 7 && (
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
            // Auto-enable metadata extension for Token-2022
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

      {/* NEW: Metadata Type Selection */}
      {currentStep === 'metadataType' && (
        <MetadataTypeSelector
          value={state.metadataApproach}
          onChange={handleMetadataTypeChange}
          onNext={handleNext}
        />
      )}

      {/* NEW: Metadata Configuration (Conditional) */}
      {currentStep === 'metadataConfig' && state.metadataApproach === 'enumeration' && (
        <AssetMetadataWizard
          onComplete={handleEnumerationComplete}
          onCancel={handleBack}
        />
      )}

      {currentStep === 'metadataConfig' && state.metadataApproach === 'universal' && (
        <UniversalProductWizard
          onComplete={handleUniversalComplete}
          onCancel={handleBack}
        />
      )}

      {currentStep === 'preview' && state.basicConfig && (
        <div className="space-y-6">
          <DeploymentPreview
            tokenType={state.tokenType}
            basicConfig={state.basicConfig}
            extensions={state.extensions}
            transferFeeConfig={state.transferFeeConfig}
            interestBearingConfig={state.interestBearingConfig}
            network={network}
          />
          
          {/* NEW: Metadata Summary in Preview */}
          {getMetadataSummary() && (
            <Card>
              <CardHeader>
                <CardTitle>On-Chain Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Approach: </span>
                    <span className="text-sm font-medium">{getMetadataSummary()!.approach}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Fields: </span>
                    <span className="text-sm font-medium">{getMetadataSummary()!.itemCount}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Size: </span>
                    <span className="text-sm font-medium">
                      {getMetadataSummary()!.size} bytes / 1024 bytes
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
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