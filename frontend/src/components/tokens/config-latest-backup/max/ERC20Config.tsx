import React from "react";
import ERC20BaseForm from "./ERC20BaseForm";
import ERC20PropertiesForm from "./ERC20PropertiesForm";

/**
 * ERC20Config - Complete ERC-20 token configuration
 * 
 * Combines:
 * - ERC20BaseForm: Core token fields from main tokens table
 * - ERC20PropertiesForm: ERC-20 specific properties from token_erc20_properties table
 * 
 * This modular approach keeps files manageable and follows domain separation
 */

interface ERC20ConfigProps {
  tokenForm?: any;
  handleInputChange?: (field: string, value: any) => void;
  setTokenForm?: React.Dispatch<React.SetStateAction<any>>;
  onConfigChange?: (config: any) => void;
}

const ERC20Config: React.FC<ERC20ConfigProps> = ({ 
  tokenForm = {},
  handleInputChange,
  setTokenForm,
  onConfigChange
}) => {
  // Unified change handler for both forms
  const handleChange = (field: string, value: any) => {
    if (handleInputChange) {
      handleInputChange(field, value);
    } else if (setTokenForm) {
      setTokenForm(prev => ({ ...prev, [field]: value }));
    }
    
    if (onConfigChange) {
      onConfigChange({ ...tokenForm, [field]: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Base Token Configuration */}
      <ERC20BaseForm
        tokenForm={tokenForm}
        onInputChange={handleChange}
      />
      
      {/* ERC-20 Specific Properties */}
      <ERC20PropertiesForm
        tokenForm={tokenForm}
        onInputChange={handleChange}
      />
    </div>
  );
};

export default ERC20Config;

// Export individual forms for standalone use
export { ERC20BaseForm, ERC20PropertiesForm };