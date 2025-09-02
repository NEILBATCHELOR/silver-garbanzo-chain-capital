/**
 * Enhanced Token Form State Hook - Fixed Version for ERC-721 Validation Issues
 * Resolves state synchronization problems causing validation errors
 * 
 * Key fixes:
 * - Immediate parent state updates
 * - Proper initial value handling
 * - Robust state synchronization
 * - Debug logging for troubleshooting
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { TokenStandard } from '@/types/core/centralModels';
import { TokenFormData } from '../types';

interface UseMinConfigFormProps {
  tokenForm?: Partial<TokenFormData>;
  initialConfig?: any;
  onConfigChange?: (config: any) => void;
  setTokenForm?: (updater: any) => void;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function useMinConfigFormEnhanced({
  tokenForm,
  initialConfig = {},
  onConfigChange,
  setTokenForm,
  handleInputChange
}: UseMinConfigFormProps) {
  
  // Track if this is the initial mount to avoid unnecessary syncs
  const isInitialMount = useRef(true);
  const syncInProgress = useRef(false);
  
  // Initialize form data - prioritize tokenForm, then initialConfig, then defaults
  const initializeFormData = useCallback(() => {
    const data = {
      // Core fields for all standards
      name: tokenForm?.name || initialConfig.name || "",
      symbol: tokenForm?.symbol || initialConfig.symbol || "",
      description: tokenForm?.description || initialConfig.description || "",
      decimals: tokenForm?.decimals ?? initialConfig.decimals ?? 18,
      
      // ERC-20 specific
      initialSupply: tokenForm?.initialSupply || initialConfig.initialSupply || "",
      cap: tokenForm?.cap || initialConfig.cap || "",
      tokenType: tokenForm?.tokenType || initialConfig.tokenType || "utility",
      isMintable: tokenForm?.isMintable ?? initialConfig.isMintable ?? true,
      isBurnable: tokenForm?.isBurnable ?? initialConfig.isBurnable ?? false,
      isPausable: tokenForm?.isPausable ?? initialConfig.isPausable ?? false,
      
      // ERC-721/ERC-1155/ERC-3525 specific - CRITICAL FOR ERC-721
      baseUri: tokenForm?.baseUri || initialConfig.baseUri || "",
      maxSupply: tokenForm?.maxSupply || initialConfig.maxSupply || "",
      royaltyPercentage: tokenForm?.royaltyPercentage || initialConfig.royaltyPercentage || "",
      royaltyReceiver: tokenForm?.royaltyReceiver || initialConfig.royaltyReceiver || "",
      hasRoyalty: tokenForm?.hasRoyalty ?? initialConfig.hasRoyalty ?? false,
      
      // ERC-1155 specific
      metadataStorage: tokenForm?.metadataStorage || initialConfig.metadataStorage || "ipfs",
      batchMinting: tokenForm?.batchMinting ?? initialConfig.batchMinting ?? true,
      
      // ERC-1400 specific
      issuingJurisdiction: tokenForm?.issuingJurisdiction || initialConfig.issuingJurisdiction || "",
      
      // ERC-3525 specific
      valueDecimals: tokenForm?.valueDecimals ?? initialConfig.valueDecimals ?? 18,
      
      // ERC-4626 specific
      assetAddress: tokenForm?.assetAddress || initialConfig.assetAddress || "",
      assetName: tokenForm?.assetName || initialConfig.assetName || "",
      assetSymbol: tokenForm?.assetSymbol || initialConfig.assetSymbol || "",
      assetDecimals: tokenForm?.assetDecimals ?? initialConfig.assetDecimals ?? 18,
      
      // Copy any additional fields
      ...initialConfig,
      ...tokenForm
    };
    
    return data;
  }, [tokenForm, initialConfig]);
  
  // Single source of truth for form data
  const [formData, setFormData] = useState(initializeFormData);
  
  // Sync with parent tokenForm when it changes
  useEffect(() => {
    if (!isInitialMount.current && tokenForm && !syncInProgress.current) {
      const newFormData = initializeFormData();
      setFormData(newFormData);
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }
  }, [tokenForm, initializeFormData]);
  
  // Notify parent when formData changes
  useEffect(() => {
    if (!isInitialMount.current && onConfigChange && !syncInProgress.current) {
      onConfigChange(formData);
    }
  }, [formData, onConfigChange]);
  
  // Centralized field change handler with immediate parent sync
  const handleFieldChange = useCallback((field: string, value: any) => {
    syncInProgress.current = true;
    
    // Update internal form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // IMMEDIATE parent state update - this is crucial for validation
    if (setTokenForm) {
      setTokenForm((prev: any) => ({
        ...prev,
        [field]: value
      }));
    }
    
    // Small delay to prevent race conditions
    setTimeout(() => {
      syncInProgress.current = false;
    }, 10);
  }, [setTokenForm]);
  
  // Input change handler with enhanced parent sync
  const handleInputChangeWrapper = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    if (type === 'number') {
      processedValue = value === '' ? '' : Number(value);
    }
    
    // Update via centralized handler
    handleFieldChange(name, processedValue);
    
    // Also call original handleInputChange if provided
    if (handleInputChange) {
      handleInputChange(e);
    }
  }, [handleFieldChange, handleInputChange]);
  
  // Switch/boolean change handler
  const handleSwitchChange = useCallback((field: string, checked: boolean) => {
    handleFieldChange(field, checked);
  }, [handleFieldChange]);
  
  // Select change handler
  const handleSelectChange = useCallback((field: string, value: any) => {
    handleFieldChange(field, value);
  }, [handleFieldChange]);
  
  return {
    formData,
    handleFieldChange,
    handleInputChange: handleInputChangeWrapper,
    handleSwitchChange,
    handleSelectChange,
    updateFormData: setFormData,
    hasData: Object.values(formData).some(value => 
      value !== null && value !== undefined && value !== ''
    )
  };
}

export default useMinConfigFormEnhanced;