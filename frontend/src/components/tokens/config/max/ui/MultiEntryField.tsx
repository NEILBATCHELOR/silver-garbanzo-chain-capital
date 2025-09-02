import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MultiEntryFieldProps {
  label: string;
  description?: string;
  placeholder: string;
  values: string[];
  onValuesChange: (values: string[]) => void;
  maxItems?: number;
  className?: string;
  validation?: (value: string) => boolean;
  validationError?: string;
}

/**
 * MultiEntryField - Component for managing multiple entries (addresses, country codes, etc.)
 * Provides clean UI for adding/removing multiple values with validation
 */
export const MultiEntryField: React.FC<MultiEntryFieldProps> = ({
  label,
  description,
  placeholder,
  values,
  onValuesChange,
  maxItems = 50,
  className = "",
  validation,
  validationError = "Invalid value"
}) => {
  const [currentValue, setCurrentValue] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    const trimmedValue = currentValue.trim();
    
    if (!trimmedValue) {
      setError("Value cannot be empty");
      return;
    }

    if (values.includes(trimmedValue)) {
      setError("Value already exists");
      return;
    }

    // Custom validation if provided
    if (validation && !validation(trimmedValue)) {
      setError(validationError);
      return;
    }

    if (values.length >= maxItems) {
      setError(`Maximum ${maxItems} items allowed`);
      return;
    }

    onValuesChange([...values, trimmedValue]);
    setCurrentValue("");
    setError("");
  };

  const handleRemove = (indexToRemove: number) => {
    onValuesChange(values.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Input row */}
      <div className="flex items-center space-x-2">
        <Input
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            setError("");
          }}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={handleAdd}
          size="sm"
          variant="outline"
          disabled={!currentValue.trim() || values.length >= maxItems}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Values display */}
      {values.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {values.length} item{values.length !== 1 ? 's' : ''} added
            {maxItems && ` (max ${maxItems})`}
          </div>
          <div className="flex flex-wrap gap-2">
            {values.map((value, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1"
              >
                <span className="text-xs">{value}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


