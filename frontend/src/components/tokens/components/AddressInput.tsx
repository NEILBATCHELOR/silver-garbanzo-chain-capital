/**
 * Enhanced Address Input Component
 * Provides a smooth editing experience for Ethereum addresses with validation
 */
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, Copy, Loader2 } from 'lucide-react';
import { cn } from '@/utils/shared/utils';
import {
  validateEthereumAddress,
  sanitizeAddressInput,
  shortenAddress,
  formatEthereumAddress
} from '../utils/addressValidation';
import { useFieldValidation } from '../hooks/useRealtimeValidation';

interface AddressInputProps {
  id?: string;
  name?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
  allowEmpty?: boolean;
  autoFormat?: boolean;
}

/**
 * Enhanced input component for Ethereum addresses
 */
export const AddressInput: React.FC<AddressInputProps> = ({
  id,
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder = "0x...",
  required = false,
  disabled = false,
  className,
  showValidation = true,
  allowEmpty = true,
  autoFormat = true
}) => {
  const [internalValue, setInternalValue] = useState(value || '');
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validation using the field validation hook
  const { isValid, isValidating, message } = useFieldValidation(
    name || 'address',
    internalValue,
    (val: string) => {
      if (!val || val.trim() === '') {
        if (allowEmpty && !required) {
          return { isValid: true };
        }
        return { isValid: false, message: 'Address is required' };
      }
      return validateEthereumAddress(val);
    },
    300
  );

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    
    // Auto-format if enabled
    if (autoFormat) {
      newValue = sanitizeAddressInput(newValue);
    }
    
    setInternalValue(newValue);
    setHasBeenTouched(true);
    
    // Call parent onChange
    onChange(newValue);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle input blur
  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenTouched(true);
    
    // Auto-format on blur if enabled
    if (autoFormat && internalValue) {
      const formatted = formatEthereumAddress(internalValue);
      if (formatted !== internalValue) {
        setInternalValue(formatted);
        onChange(formatted);
      }
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    if (autoFormat) {
      const sanitized = sanitizeAddressInput(pastedText);
      setInternalValue(sanitized);
      onChange(sanitized);
    } else {
      setInternalValue(pastedText);
      onChange(pastedText);
    }
    
    setHasBeenTouched(true);
  };

  // Copy address to clipboard
  const copyToClipboard = async () => {
    if (internalValue && isValid) {
      try {
        await navigator.clipboard.writeText(internalValue);
      } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = internalValue;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  // Determine validation state
  const showValidationState = showValidation && hasBeenTouched && !isFocused;
  const hasError = showValidationState && !isValid && internalValue.length > 0;
  const hasSuccess = showValidationState && isValid && internalValue.length > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={internalValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-20",
            hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
            hasSuccess && "border-green-500 focus:border-green-500 focus:ring-green-500"
          )}
        />
        
        {/* Status icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          
          {showValidationState && !isValidating && (
            <>
              {hasSuccess && (
                <div className="flex items-center space-x-1">
                  <Check className="h-4 w-4 text-green-500" />
                  {internalValue && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={copyToClipboard}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
              
              {hasError && (
                <X className="h-4 w-4 text-red-500" />
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Validation feedback */}
      {showValidationState && !isValidating && (
        <div className="min-h-[1.25rem]">
          {hasError && (
            <p className="text-sm text-red-600">{message}</p>
          )}
          
          {hasSuccess && internalValue && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-600">Valid address</p>
              <Badge variant="secondary" className="text-xs">
                {shortenAddress(internalValue)}
              </Badge>
            </div>
          )}
        </div>
      )}
      
      {/* Helper text for empty required fields */}
      {!hasBeenTouched && required && allowEmpty && (
        <p className="text-sm text-muted-foreground">
          Enter a valid Ethereum address (0x...)
        </p>
      )}
    </div>
  );
};

export default AddressInput;
