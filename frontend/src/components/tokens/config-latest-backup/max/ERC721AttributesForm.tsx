import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, TrashIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * ERC721AttributesForm - Token attributes from token_erc721_attributes table
 * 
 * Handles NFT attribute definitions that define the structure of token metadata:
 * - trait_type: The name of the attribute (e.g., "Background", "Eyes", "Rarity")  
 * - values: Array of possible values for this trait (e.g., ["Blue", "Green", "Brown"])
 * 
 * These are used to define what attributes NFTs in the collection can have.
 * Individual token attributes are set during minting or metadata assignment.
 */

interface TokenAttribute {
  id?: string;
  trait_type: string;
  values: string[];
}

interface ERC721AttributesFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC721AttributesForm: React.FC<ERC721AttributesFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const [attributes, setAttributes] = useState<TokenAttribute[]>(() => {
    return tokenForm.token_attributes || [
      {
        trait_type: "",
        values: [""]
      }
    ];
  });

  // Update parent when attributes change
  useEffect(() => {
    onInputChange("token_attributes", attributes);
  }, [attributes, onInputChange]);

  const addAttribute = () => {
    setAttributes(prev => [
      ...prev,
      {
        trait_type: "",
        values: [""]
      }
    ]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const updateAttributeTraitType = (index: number, traitType: string) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === index ? { ...attr, trait_type: traitType } : attr
    ));
  };

  const updateAttributeValues = (index: number, values: string[]) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === index ? { ...attr, values } : attr
    ));
  };

  const addValue = (attributeIndex: number) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === attributeIndex 
        ? { ...attr, values: [...attr.values, ""] }
        : attr
    ));
  };

  const removeValue = (attributeIndex: number, valueIndex: number) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === attributeIndex 
        ? { ...attr, values: attr.values.filter((_, vi) => vi !== valueIndex) }
        : attr
    ));
  };

  const updateValue = (attributeIndex: number, valueIndex: number, value: string) => {
    setAttributes(prev => prev.map((attr, i) => 
      i === attributeIndex 
        ? { 
            ...attr, 
            values: attr.values.map((v, vi) => vi === valueIndex ? value : v)
          }
        : attr
    ));
  };

  // Predefined common trait types for NFT collections
  const commonTraitTypes = [
    "Background",
    "Eyes", 
    "Mouth",
    "Hair",
    "Clothing",
    "Accessories",
    "Rarity",
    "Color",
    "Pattern",
    "Style",
    "Material",
    "Size",
    "Special",
    "Power Level",
    "Element",
    "Class"
  ];

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            NFT Attributes Definition
            <Tooltip>
              <TooltipTrigger className="ml-2">
                <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Define the attributes (traits) that NFTs in your collection can have. 
                  Each attribute has a name and possible values.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Define the possible attributes for your NFT collection. These will be used in metadata generation.
          </div>

          {attributes.map((attribute, attributeIndex) => (
            <div key={attributeIndex} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Attribute {attributeIndex + 1}
                </Badge>
                {attributes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttribute(attributeIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`traitType-${attributeIndex}`} className="flex items-center">
                  Trait Type *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">The name of this attribute (e.g., "Background", "Eyes", "Rarity")</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={attribute.trait_type}
                    onValueChange={(value) => updateAttributeTraitType(attributeIndex, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select or type custom" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonTraitTypes.map((traitType) => (
                        <SelectItem key={traitType} value={traitType}>
                          {traitType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id={`traitType-${attributeIndex}`}
                    placeholder="Or enter custom trait type"
                    value={attribute.trait_type}
                    onChange={(e) => updateAttributeTraitType(attributeIndex, e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center">
                  Possible Values *
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">All possible values for this attribute (e.g., for "Eyes": "Blue", "Green", "Brown")</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                
                {attribute.values.map((value, valueIndex) => (
                  <div key={valueIndex} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Value ${valueIndex + 1}`}
                      value={value}
                      onChange={(e) => updateValue(attributeIndex, valueIndex, e.target.value)}
                      className="flex-1"
                    />
                    {attribute.values.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeValue(attributeIndex, valueIndex)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addValue(attributeIndex)}
                  className="w-full"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Value
                </Button>
              </div>

              {/* Attribute Preview */}
              {attribute.trait_type && attribute.values.some(v => v.trim()) && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="text-sm font-medium mb-2">Preview:</div>
                  <div className="text-sm">
                    <span className="font-medium">{attribute.trait_type}:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {attribute.values
                        .filter(v => v.trim())
                        .map((value, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {value}
                          </Badge>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addAttribute}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Attribute
          </Button>

          {/* Summary */}
          {attributes.some(attr => attr.trait_type && attr.values.some(v => v.trim())) && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-2">
                Collection Attributes Summary
              </div>
              <div className="text-sm text-blue-800">
                Total Attributes: {attributes.filter(attr => attr.trait_type && attr.values.some(v => v.trim())).length}
              </div>
              <div className="text-xs text-blue-700 mt-2">
                These attributes will be available when setting individual NFT metadata during minting.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC721AttributesForm;
