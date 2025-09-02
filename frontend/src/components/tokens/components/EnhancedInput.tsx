/**
 * Enhanced Input Component - Optimized for Smooth Typing
 * Fixed to eliminate flickering by removing conflicting state management
 */
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/shared/utils';

interface ValidationRule {
  validator: (value: any) => { isValid: boolean; message?: string };
  debounceMs?: number;
}

interface EnhancedInputProps {
  id?: string;
  name?: string;
  label?: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showValidation?: boolean;
  validation?: ValidationRule;
  helpText?: string;
  rows?: number;
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  autoFormat?: (value: string) => string;
}

/**
 * Enhanced input component optimized to prevent flickering
 */
export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  id,
  name,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  disabled = false,
  className,
  showValidation = true,
  validation,
  helpText,
  rows = 3,
  min,
  max,
  step,
  maxLength,
  autoFormat
}) => {
  // UI state only - no value state conflicts
  const [isFocused, setIsFocused] = useState(false);
  const [hasBeenBlurred, setHasBeenBlurred] = useState(false);
  const [validationState, setValidationState] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: true });
  
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // Convert value to string for display
  const displayValue = useMemo(() => String(value || ''), [value]);

  // Optimized validation function
  const defaultValidation = useCallback((val: string | number) => {
    const stringVal = String(val).trim();
    
    if (required && (!stringVal || stringVal === '')) {
      return { isValid: false, message: 'This field is required' };
    }
    
    if (type === 'email' && stringVal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringVal)) {
        return { isValid: false, message: 'Please enter a valid email address' };
      }
    }
    
    if (type === 'number' && stringVal) {
      const numVal = Number(stringVal);
      if (isNaN(numVal)) {
        return { isValid: false, message: 'Please enter a valid number' };
      }
      
      if (min !== undefined && numVal < min) {
        return { isValid: false, message: `Value must be at least ${min}` };
      }
      
      if (max !== undefined && numVal > max) {
        return { isValid: false, message: `Value must be no more than ${max}` };
      }
    }
    
    return { isValid: true };
  }, [required, type, min, max]);

  // Lightweight validation with much longer debounce during typing
  const runValidation = useCallback((val: string, immediate = false) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    const validationFn = validation?.validator || defaultValidation;
    // Much longer debounce while typing to eliminate flickering
    const delay = immediate ? 0 : (isFocused ? 2500 : 1000);

    validationTimeoutRef.current = setTimeout(() => {
      const result = validationFn(val);
      setValidationState(result);
    }, delay);
  }, [validation, defaultValidation, isFocused]);

  // Ultra-minimal input handler - zero processing during typing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;
    
    // Apply max length early to prevent disruption
    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength);
    }
    
    // NO formatting during typing for smooth UX - only on blur
    
    // Update parent immediately with minimal processing
    if (type === 'number') {
      const numValue = newValue === '' ? '' : Number(newValue);
      onChange(numValue);
    } else {
      onChange(newValue);
    }
    
    // Skip validation entirely while typing actively
  };

  // Focus handler - clear validation completely for clean typing experience
  const handleFocus = () => {
    setIsFocused(true);
    // Clear all validation visual feedback during typing
    setValidationState({ isValid: true });
    
    // Clear any pending validation timeouts
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
  };

  // Blur handler - apply final formatting, conversion, and validation
  const handleBlur = () => {
    setIsFocused(false);
    setHasBeenBlurred(true);
    
    let finalValue = displayValue;
    
    // Apply symbol-specific formatting only on blur for smooth UX
    if (name === 'symbol' && finalValue) {
      finalValue = finalValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }
    
    // Apply full autoFormat only on blur to avoid disrupting typing
    if (autoFormat && finalValue) {
      const formattedValue = autoFormat(finalValue);
      if (formattedValue !== finalValue) {
        finalValue = formattedValue;
      }
    }
    
    // Update parent with final formatted value if changed
    if (finalValue !== displayValue) {
      if (type === 'number') {
        onChange(Number(finalValue) || 0);
      } else {
        onChange(finalValue);
      }
    }
    
    // Run validation immediately on blur with final value
    if (showValidation) {
      runValidation(finalValue, true);
    }
    
    if (onBlur) {
      onBlur();
    }
  };

  // Determine validation display state
  const showValidationState = showValidation && hasBeenBlurred && !isFocused;
  const hasError = showValidationState && !validationState.isValid && displayValue.trim() !== '';
  const hasSuccess = showValidationState && validationState.isValid && displayValue.trim() !== '' && required;
  const isEmpty = !displayValue || displayValue.toString().trim() === '';
  const showRequiredWarning = required && isEmpty && hasBeenBlurred && !isFocused;

  const baseProps = {
    id,
    name,
    value: displayValue, // Use computed display value
    onChange: handleInputChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    placeholder,
    disabled,
    className: cn(
      "transition-colors",
      hasError && "border-red-500 focus:border-red-500 focus:ring-red-500",
      hasSuccess && "border-green-500",
      showRequiredWarning && "border-orange-400"
    ),
    ...(type === 'number' && {
      type: 'number',
      min,
      max,
      step
    }),
    ...(type === 'email' && {
      type: 'email'
    }),
    ...(type === 'password' && {
      type: 'password'
    }),
    ...(type === 'textarea' && {
      rows
    }),
    ...(maxLength && {
      maxLength
    })
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={id} className="flex items-center">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {type === 'textarea' ? (
          <Textarea {...baseProps} ref={textareaRef} />
        ) : (
          <Input {...baseProps} ref={inputRef} />
        )}
        
        {/* Status icons - only when not focused */}
        {!isFocused && displayValue && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {hasSuccess && <Check className="h-4 w-4 text-green-500" />}
            {hasError && <X className="h-4 w-4 text-red-500" />}
            {showRequiredWarning && <AlertCircle className="h-4 w-4 text-orange-500" />}
          </div>
        )}
      </div>
      
      {/* Character count - only when approaching limit */}
      {maxLength && displayValue && displayValue.length > maxLength * 0.8 && (
        <div className="flex justify-end">
          <Badge variant="outline" className="text-xs">
            {displayValue.length}/{maxLength}
          </Badge>
        </div>
      )}
      
      {/* Validation feedback - only after blur and when not typing */}
      {showValidationState && (
        <div className="min-h-[1.25rem]">
          {hasError && validationState.message && (
            <p className="text-sm text-red-600 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              {validationState.message}
            </p>
          )}
        </div>
      )}
      
      {/* Required warning */}
      {showRequiredWarning && (
        <p className="text-sm text-orange-600 flex items-center">
          <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
          This field is required
        </p>
      )}
      
      {/* Help text - show when clean state */}
      {helpText && !showValidationState && !showRequiredWarning && (
        <p className="text-sm text-muted-foreground">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default EnhancedInput;