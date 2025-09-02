/**
 * useMinConfigForm - Centralized State Management Hook
 * 
 * Eliminates validation issues by providing single source of truth
 * for token configuration forms. Based on working patterns from forms-comprehensive.
 */
import { useState, useEffect, useCallback } from 'react';
import { TokenFormData } from '@/components/tokens/types';

interface UseMinConfigFormProps {
  tokenForm?: Partial<TokenFormData>;
  initialConfig?: any;
  onConfigChange?: (config: any) => void;
  setTokenForm?: (updater: (prev: any) => any) => void;
  handleInputChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

interface UseMinConfigFormReturn {
  formData: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
  handleSelectChange: (name: string, value: any) => void;
  handleFieldChange: (field: string, value: any) => void;
}

/**
 * Centralized state management hook for min config forms
 * Provides single source of truth with automatic synchronization
 */
export function useMinConfigForm({
  tokenForm,
  initialConfig = {},
  onConfigChange,
  setTokenForm,
  handleInputChange
}: UseMinConfigFormProps): UseMinConfigFormReturn {
  
  // Initialize form data with proper fallbacks
  const initializeFormData = useCallback(() => {
    return {
      ...initialConfig,
      ...tokenForm,
    };
  }, [tokenForm, initialConfig]);

  // Single source of truth for form data
  const [formData, setFormData] = useState(initializeFormData);

  // Bidirectional synchronization with parent tokenForm
  useEffect(() => {
    if (tokenForm) {
      setFormData(initializeFormData());
    }
  }, [tokenForm, initializeFormData]);

  // Centralized field change handler
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update parent state directly
    if (setTokenForm) {
      setTokenForm((prev: any) => ({ ...prev, [field]: value }));
    }
    
    // Call onConfigChange if provided
    if (onConfigChange) {
      onConfigChange({ [field]: value });
    }
  }, [setTokenForm, onConfigChange]);

  // Wrapper for input change events
  const handleInputChangeWrapper = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let newValue: any = value;
    
    // Convert number inputs to actual numbers
    if (type === 'number') {
      newValue = value === '' ? '' : Number(value);
    }
    
    // Update internal state
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Update parent state directly
    if (setTokenForm) {
      setTokenForm((prev: any) => ({ ...prev, [name]: newValue }));
    }
    
    // Call original handleInputChange if provided
    if (handleInputChange) {
      handleInputChange(e);
    }
    
    // Call onConfigChange if provided
    if (onConfigChange) {
      onConfigChange({ [name]: newValue });
    }
  }, [setTokenForm, handleInputChange, onConfigChange]);

  // Switch change handler
  const handleSwitchChange = useCallback((name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
    
    // Update parent state directly
    if (setTokenForm) {
      setTokenForm((prev: any) => ({ ...prev, [name]: checked }));
    }
    
    // Call onConfigChange if provided
    if (onConfigChange) {
      onConfigChange({ [name]: checked });
    }
  }, [setTokenForm, onConfigChange]);

  // Select change handler
  const handleSelectChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Update parent state directly
    if (setTokenForm) {
      setTokenForm((prev: any) => ({ ...prev, [name]: value }));
    }
    
    // Call onConfigChange if provided
    if (onConfigChange) {
      onConfigChange({ [name]: value });
    }
  }, [setTokenForm, onConfigChange]);

  return {
    formData,
    handleInputChange: handleInputChangeWrapper,
    handleSwitchChange,
    handleSelectChange,
    handleFieldChange
  };
}

export default useMinConfigForm;
