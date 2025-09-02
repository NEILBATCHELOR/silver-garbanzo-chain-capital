/**
 * CreateTokenPage - Simplified Basic Mode Only
 * 
 * A simplified page for creating new tokens with only basic configuration.
 * Always uses Basic Mode configuration for streamlined user experience.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, ArrowLeft, Download, Upload, Save, Info, CheckCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AssetTypeSelector, { FinancialProductCategory } from '@/components/tokens/components/AssetTypeSelector';
import StandardRecommender from '@/components/tokens/components/StandardRecommender';
import TokenStandardSelector from '@/components/tokens/components/TokenStandardSelector';
import { createToken } from '@/components/tokens/services/tokenService';
import TokenPageLayout from '../layout/TokenPageLayout';
import { TokenStandard } from '@/types/core/centralModels';
import { Stepper } from '@/components/ui/stepper';
import { TokenFormData } from '@/components/tokens/types';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

// Import ONLY simple/basic configuration components
import {
  ERC20SimpleConfig,
  ERC721SimpleConfig,
  ERC1155SimpleConfig,
  ERC1400SimpleConfig,
  ERC3525SimpleConfig,
  ERC4626SimpleConfig
} from '@/components/tokens/config';

// Import standard-specific upload dialogs
import ERC20ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC20ConfigUploadDialog';
import ERC721ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC721ConfigUploadDialog';
import ERC1155ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC1155ConfigUploadDialog';
import ERC1400ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC1400ConfigUploadDialog';
import ERC3525ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC3525ConfigUploadDialog';
import ERC4626ConfigUploadDialog from '@/components/tokens/components/upload-dialogs/ERC4626ConfigUploadDialog';

// Import project context
import useTokenProjectContext from '@/hooks/project/useTokenProjectContext';
import { logger } from '@/utils/shared/logging/contextLogger';

// Define creation status type
type CreateStatus = 'idle' | 'validating' | 'submitting' | 'success' | 'error';

// Define creation logs type
interface CreationLog {
  status: 'success' | 'error';
  message?: string;
  count?: number;
}

interface CreationLogs {
  mainToken?: CreationLog;
  standardProperties?: CreationLog;
  arrayData?: Record<string, CreationLog>;
}

const CreateTokenPage: React.FC = () => {
  const { projectId, project, isLoading: projectLoading } = useTokenProjectContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const logContext = 'CreateTokenPage';
  
  // Anti-flickering configuration
  const lastDebugTrackRef = useRef<number>(0);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // State for token creation - ALWAYS BASIC MODE
  const [selectedStandard, setSelectedStandard] = useState<TokenStandard>(TokenStandard.ERC20);
  const [assetType, setAssetType] = useState<FinancialProductCategory | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [tokenData, setTokenData] = useState<Partial<TokenFormData>>({
    name: '',
    symbol: '',
    standard: TokenStandard.ERC20,
    status: 'DRAFT',
    config_mode: 'min', // ALWAYS BASIC MODE
  });

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [createStatus, setCreateStatus] = useState<CreateStatus>('idle');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdTokenId, setCreatedTokenId] = useState<string | null>(null);
  const [creationLogs, setCreationLogs] = useState<CreationLogs>({});
  

  
  // Upload dialog states - individual states for each standard
  const [showERC20UploadDialog, setShowERC20UploadDialog] = useState(false);
  const [showERC721UploadDialog, setShowERC721UploadDialog] = useState(false);
  const [showERC1155UploadDialog, setShowERC1155UploadDialog] = useState(false);
  const [showERC1400UploadDialog, setShowERC1400UploadDialog] = useState(false);
  const [showERC3525UploadDialog, setShowERC3525UploadDialog] = useState(false);
  const [showERC4626UploadDialog, setShowERC4626UploadDialog] = useState(false);
  
  // Steps for the token creation process
  const steps = [
    { label: 'Select Standard', description: 'Choose a token standard' },
    { label: 'Configure', description: 'Set token properties' },
    { label: 'Review', description: 'Review and create' }
  ];

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Update token data when standard changes
  useEffect(() => {
    if (tokenData.standard !== selectedStandard) {
      const newTokenData = {
        ...tokenData,
        standard: selectedStandard,
        config_mode: 'min' // ALWAYS BASIC MODE
      };
      
      setTokenData(newTokenData);
      logger.info(logContext, `Token data updated with standard: ${selectedStandard}`);
    }
  }, [selectedStandard, logContext]);

  /**
   * Handle standard selection with immediate state synchronization
   */
  const handleStandardChange = (standard: TokenStandard) => {
    setSelectedStandard(standard);
    logger.info(logContext, `Standard changed to ${standard}`);
    
    // Reset form data but keep project ID and name/symbol if present
    const { name, symbol, project_id } = tokenData;
    const newTokenData = {
      name: name || '',
      symbol: symbol || '',
      standard,
      project_id,
      config_mode: 'min', // ALWAYS BASIC MODE
      status: 'DRAFT' as const,
    };
    
    setTokenData(newTokenData);
  };

  /**
   * Handle asset type selection
   */
  const handleAssetTypeChange = (type: FinancialProductCategory | null) => {
    setAssetType(type);
    logger.info(logContext, `Asset type changed to ${type}`);
  };

  /**
   * Optimized form data changes with typing state management
   */
  const handleFormChange = useCallback((data: Partial<TokenFormData>) => {
    // Mark as typing and reset timeout
    isTypingRef.current = true;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to mark typing as stopped
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 500);
    
    // Batch state update for better performance
    setTokenData(prevData => {
      const newTokenData = { 
        ...prevData, 
        ...data,
        config_mode: 'min' // ALWAYS BASIC MODE
      };
      return newTokenData;
    });
  }, []);

  /**
   * Handle comprehensive JSON configuration upload
   */
  const handleConfigUpload = (uploadedData: Partial<TokenFormData>) => {
    // If the uploaded data has a different standard, change it
    if (uploadedData.standard && uploadedData.standard !== selectedStandard) {
      setSelectedStandard(uploadedData.standard);
      logger.info(logContext, `Standard changed to ${uploadedData.standard} based on uploaded configuration`);
    }
    
    // Merge uploaded data with current form data, preserving project context
    const mergedData = {
      ...uploadedData,
      project_id: projectId,
      config_mode: 'min', // ALWAYS BASIC MODE - override any uploaded advanced mode
    };
    
    // Remove any undefined or null values to clean the data
    const cleanedData = Object.fromEntries(
      Object.entries(mergedData).filter(([_, value]) => value !== undefined && value !== null)
    );
    
    setTokenData(cleanedData as TokenFormData);
    
    // Show success message with details
    const fieldsCount = Object.keys(uploadedData).length;
    toast({
      title: "Configuration Loaded Successfully",
      description: `Loaded ${fieldsCount} fields into the token form. ${uploadedData.standard ? `Detected standard: ${uploadedData.standard}` : ''} (Basic Mode)`,
    });
    
    // Navigate to configuration step if not already there
    if (currentStep === 0) {
      setCurrentStep(1);
    }
  };

  /**
   * Submit without validation - simplified for basic mode
   */
  const handleSubmit = async () => {
    setCreateStatus('submitting');
    
    try {
      // Prepare token data for submission - ALWAYS BASIC MODE
      const submissionData = {
        ...tokenData,
        config_mode: 'min', // ALWAYS BASIC MODE
        project_id: projectId
      };
      
      logger.info(logContext, "Submitting token data", submissionData);
      
      // Submit token creation
      const result = await createToken(projectId || '', submissionData);
      
      // Handle success
      if (result && result.id) {
        logger.info(logContext, "Token created successfully", result);
        setCreatedTokenId(result.id);
        
        // Create simplified logs structure from the result
        const simplifiedLogs: CreationLogs = {
          mainToken: { status: 'success' },
          standardProperties: { status: 'success' },
          arrayData: {}
        };
        
        // If we have standardInsertionResults, use them to populate arrayData
        if (result.standardInsertionResults) {
          Object.entries(result.standardInsertionResults).forEach(([key, value]) => {
            simplifiedLogs.arrayData![key] = { 
              status: 'success',
              count: Array.isArray(value) ? value.length : 1
            };
          });
        }
        
        setCreationLogs(simplifiedLogs);
        setCreateStatus('success');
        setShowSuccessDialog(true);
      } else {
        // Handle API error
        logger.error(logContext, "Token creation failed - invalid result", result);
        setError("Failed to create token. Please try again.");
        setCreateStatus('error');
        
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: "Failed to create token. Please try again.",
        });
      }
    } catch (apiError: any) {
      // Handle API error
      logger.error(logContext, "Token creation failed", apiError);
      setError(apiError?.message || "Failed to create token. Please try again.");
      setCreateStatus('error');
      
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: apiError?.message || "Failed to create token. Please try again.",
      });
    }
  };

  /**
   * Navigate to view the created token
   */
  const handleViewCreatedToken = () => {
    if (createdTokenId) {
      navigate(`/tokens/${createdTokenId}`);
    }
    setShowSuccessDialog(false);
  };

  /**
   * Reset form to create another token
   */
  const handleCreateAnotherToken = () => {
    setShowSuccessDialog(false);
    setTokenData({
      name: '',
      symbol: '',
      standard: selectedStandard,
      project_id: projectId,
      config_mode: 'min', // ALWAYS BASIC MODE
    });
    setCreateStatus('idle');
    setError(null);
  };

  /**
   * Render configuration component - ONLY BASIC MODE COMPONENTS
   */
  const renderConfigComponent = () => {
    // Create event handler for components that expect event signature
    const handleEventChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target as HTMLInputElement;
      let newValue: any = value;
      
      // Convert number inputs to actual numbers
      if (type === 'number') {
        newValue = value === '' ? '' : Number(value);
      }
      
      handleFormChange({ [name]: newValue });
    };
    
    // Props for simple (basic) config components
    const simpleConfigProps = {
      tokenForm: tokenData as any,
      handleInputChange: handleEventChange,
      setTokenForm: setTokenData,
      onConfigChange: (config: any) => handleFormChange(config)
    };
    
    // ONLY BASIC MODE COMPONENTS - NO ADVANCED MODE
    switch (selectedStandard) {
      case TokenStandard.ERC20:
        return <ERC20SimpleConfig {...simpleConfigProps} />;
      case TokenStandard.ERC721:
        return <ERC721SimpleConfig {...simpleConfigProps} />;
      case TokenStandard.ERC1155:
        return <ERC1155SimpleConfig {...simpleConfigProps} />;
      case TokenStandard.ERC1400:
        return <ERC1400SimpleConfig {...simpleConfigProps} />;
      case TokenStandard.ERC3525:
        return <ERC3525SimpleConfig {...simpleConfigProps} />;
      case TokenStandard.ERC4626:
        return <ERC4626SimpleConfig {...simpleConfigProps} />;
      default:
        return <div className="p-4">Configuration not available for {selectedStandard}</div>;
    }
  };

  /**
   * Render step content based on current step
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Token Standard</CardTitle>
              </CardHeader>
              <CardContent>
                <TokenStandardSelector
                  selectedStandard={selectedStandard}
                  onChange={handleStandardChange}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Asset Builder</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Selecting an asset type will help recommend the most appropriate token standard.
                </p>
                <AssetTypeSelector
                  selectedCategory={assetType}
                  onChange={handleAssetTypeChange}
                />
                {assetType && (
                  <div className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Recommended Standards</h3>
                    <StandardRecommender
                      assetCategory={assetType}
                      onSelectStandard={handleStandardChange}
                    />
                    <div className="mt-4">
                      <Button
                        variant="default"
                        onClick={() => setCurrentStep(1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Configure Token (Basic Mode)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          switch(selectedStandard) {
                            case TokenStandard.ERC20:
                              setShowERC20UploadDialog(true);
                              break;
                            case TokenStandard.ERC721:
                              setShowERC721UploadDialog(true);
                              break;
                            case TokenStandard.ERC1155:
                              setShowERC1155UploadDialog(true);
                              break;
                            case TokenStandard.ERC1400:
                              setShowERC1400UploadDialog(true);
                              break;
                            case TokenStandard.ERC3525:
                              setShowERC3525UploadDialog(true);
                              break;
                            case TokenStandard.ERC4626:
                              setShowERC4626UploadDialog(true);
                              break;
                            default:
                              setShowERC20UploadDialog(true);
                              break;
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Load Configuration
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Upload a JSON configuration file to populate the form (Basic Mode)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                  </div>
                  
                  {renderConfigComponent()}
                  
                  {assetType && (
                    <div>
                      {/* Asset type configuration will be handled by the config components */}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Review and Create
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Token Details</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Name:</span> {tokenData.name}</p>
                        <p><span className="font-medium">Symbol:</span> {tokenData.symbol}</p>
                        <p><span className="font-medium">Standard:</span> {tokenData.standard}</p>
                        <p><span className="font-medium">Configuration:</span> Basic Mode</p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-medium mb-2">Additional Information</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Project ID:</span> {projectId}</p>
                        {tokenData.description && (
                          <p><span className="font-medium">Description:</span> {tokenData.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Deployment Info */}
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Ready for Deployment</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-1">
                        <p><span className="font-medium">Mode:</span> Basic Mode</p>
                        <p className="text-sm text-muted-foreground">
                          Your token is ready for deployment with basic configuration using Foundry.
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                  
                  {/* General Error */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <TokenPageLayout 
      title="Create Token"
      description="Configure and deploy a new token (Basic Mode)"
    >
      <div className="container mx-auto py-6 space-y-6">
        <div className="mb-6">
          <Stepper
            steps={steps.map(step => ({ title: step.label, description: step.description }))}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
          />
        </div>
        
        {renderStepContent()}
        
        <div className="flex justify-between mt-6">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <div></div>
          )}
          
          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createStatus === 'submitting'}
            >
              {createStatus === 'submitting' ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Token
                </>
              )}
            </Button>
          )}
        </div>
        
        {/* Standard-Specific Upload Configuration Dialogs */}
        <ERC20ConfigUploadDialog
          open={showERC20UploadDialog}
          onOpenChange={setShowERC20UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        <ERC721ConfigUploadDialog
          open={showERC721UploadDialog}
          onOpenChange={setShowERC721UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        <ERC1155ConfigUploadDialog
          open={showERC1155UploadDialog}
          onOpenChange={setShowERC1155UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        <ERC1400ConfigUploadDialog
          open={showERC1400UploadDialog}
          onOpenChange={setShowERC1400UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        <ERC3525ConfigUploadDialog
          open={showERC3525UploadDialog}
          onOpenChange={setShowERC3525UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        <ERC4626ConfigUploadDialog
          open={showERC4626UploadDialog}
          onOpenChange={setShowERC4626UploadDialog}
          onUploadComplete={handleConfigUpload}
        />
        
        {/* Success Dialog */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                Token Created Successfully
              </DialogTitle>
              <DialogDescription>
                Your token has been created in Basic Mode and is ready to use.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <p className="font-medium">Token ID: {createdTokenId}</p>
                <p className="text-sm text-muted-foreground">Configuration: Basic Mode</p>
              </div>
              
              {Object.keys(creationLogs).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Creation Details:</h4>
                  <div className="space-y-2 text-sm">
                    {/* Main Token */}
                    <div className="border rounded p-2">
                      <p className="font-medium">Main Token: 
                        <span className={creationLogs.mainToken?.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                          {' '}{creationLogs.mainToken?.status}
                        </span>
                      </p>
                    </div>
                    
                    {/* Standard Properties */}
                    <div className="border rounded p-2">
                      <p className="font-medium">Standard Properties: 
                        <span className={creationLogs.standardProperties?.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                          {' '}{creationLogs.standardProperties?.status}
                        </span>
                      </p>
                    </div>
                    
                    {/* Related Records */}
                    {creationLogs.arrayData && Object.keys(creationLogs.arrayData).length > 0 && (
                      <div className="border rounded p-2">
                        <p className="font-medium">Related Records:</p>
                        <ul className="list-disc list-inside">
                          {Object.entries(creationLogs.arrayData).map(([key, value]: [string, any]) => (
                            <li key={key}>
                              {key.replace(/_/g, ' ')}: 
                              <span className={value?.status === 'success' ? 'text-green-500' : 'text-red-500'}>
                                {' '}{value?.status} 
                              </span>
                              {value?.count && <span> ({value.count} records)</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="space-x-2">
              <Button variant="outline" onClick={handleCreateAnotherToken}>
                Create Another
              </Button>
              <Button onClick={handleViewCreatedToken}>
                View Token
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TokenPageLayout>
  );
};

export default CreateTokenPage;