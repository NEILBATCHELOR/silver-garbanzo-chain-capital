/**
 * Simplified Token Form State Hook for Min Config Forms
 * Based on the working pattern from forms-comprehensive
 * 
 * Eliminates dual state management issues by providing centralized state management
 * for all min config forms (ERC-20, ERC-721, ERC-1155, ERC-1400, ERC-3525, ERC-4626)
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

export function useMinConfigForm({
  tokenForm,
  initialConfig = {},
  onConfigChange,
  setTokenForm,
  handleInputChange
}: UseMinConfigFormProps) {
  
  // Initialize form data - prioritize tokenForm, then initialConfig, then defaults
  const initializeFormData = useCallback(() => {
    return {
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
      
      // ERC-721/ERC-1155/ERC-3525 specific
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
      
      // Copy any additional fields from tokenForm or initialConfig
      ...initialConfig,
      ...tokenForm
    };
  }, [tokenForm, initialConfig]);
  
  // Single source of truth for form data
  const [formData, setFormData] = useState(initializeFormData);
  
  // Track previous tokenForm to prevent unnecessary updates
  const prevTokenFormRef = useRef(tokenForm);
  
  // Sync with parent tokenForm when it changes (prevent infinite loops)
  useEffect(() => {
    // Only update if tokenForm actually changed
    if (tokenForm && tokenForm !== prevTokenFormRef.current) {
      const newFormData = initializeFormData();
      // Only update if the data is actually different
      if (JSON.stringify(newFormData) !== JSON.stringify(formData)) {
        setFormData(newFormData);
      }
      prevTokenFormRef.current = tokenForm;
    }
  }, [tokenForm, initializeFormData]);
  
  // Notify parent when formData changes (with debouncing to prevent loops)
  const onConfigChangeRef = useRef(onConfigChange);
  useEffect(() => {
    onConfigChangeRef.current = onConfigChange;
  }, [onConfigChange]);
  
  useEffect(() => {
    // Only call onConfigChange if the component receives it as a prop
    // and avoid calling it during initialization
    if (onConfigChangeRef.current) {
      const timeoutId = setTimeout(() => {
        onConfigChangeRef.current?.(formData);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [formData]);
  
  // Centralized field change handler
  const handleFieldChange = useCallback((field: string, value: any) => {
    // Update internal form data
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Also update parent state directly if setTokenForm is available
    if (setTokenForm) {
      setTokenForm((prev: any) => ({
        ...prev,
        [field]: value
      }));
    }
  }, [setTokenForm]);
  
  // Input change handler that integrates with existing handleInputChange pattern
  const handleInputChangeWrapper = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    let processedValue: any = value;
    
    // Convert number inputs to actual numbers
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
  
  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initializeFormData());
  }, [initializeFormData]);
  
  return {
    // Form data - single source of truth
    formData,
    
    // Event handlers
    handleFieldChange,
    handleInputChange: handleInputChangeWrapper,
    handleSwitchChange,
    handleSelectChange,
    resetForm,
    
    // Utilities
    updateFormData: setFormData,
    hasData: Object.values(formData).some(value => 
      value !== null && value !== undefined && value !== ''
    )
  };
}

export default useMinConfigForm;
