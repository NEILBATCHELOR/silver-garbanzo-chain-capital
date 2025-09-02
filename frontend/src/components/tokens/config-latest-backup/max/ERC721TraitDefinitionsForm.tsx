import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash, Info, Gamepad } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

/**
 * ERC721TraitDefinitionsForm - Trait definitions from token_erc721_trait_definitions table
 * 
 * Handles advanced trait definitions with rarity and value specifications:
 * - trait_name: The name of the trait (e.g., "Background", "Eyes")
 * - trait_type: The data type (string, number, boolean, array)
 * - possible_values: JSONB object defining all possible values
 * - rarity_weights: JSONB object defining rarity percentages for each value
 * - is_required: Whether every NFT must have this trait
 * 
 * This is more advanced than ERC721AttributesForm and includes rarity distribution
 * for procedural generation and marketplace rarity calculations.
 */

interface TraitValue {
  name: string;
  weight: number; // Rarity weight (higher = more common)
  description?: string;
}

interface TraitDefinition {
  id?: string;
  trait_name: string;
  trait_type: 'string' | 'number' | 'boolean' | 'array';
  possible_values: TraitValue[];
  is_required: boolean;
}

interface ERC721TraitDefinitionsFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC721TraitDefinitionsForm: React.FC<ERC721TraitDefinitionsFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const [traitDefinitions, setTraitDefinitions] = useState<TraitDefinition[]>(() => {
    return tokenForm.trait_definitions || [
      {
        trait_name: "",
        trait_type: "string",
        possible_values: [
          { name: "", weight: 100 }
        ],
        is_required: false
      }
    ];
  });

  // Update parent when trait definitions change
  useEffect(() => {
    // Convert to database format
    const dbFormat = traitDefinitions.map(trait => ({
      ...trait,
      possible_values: trait.possible_values.reduce((acc, val) => {
        acc[val.name] = val.description || val.name;
        return acc;
      }, {} as Record<string, string>),
      rarity_weights: trait.possible_values.reduce((acc, val) => {
        acc[val.name] = val.weight;
        return acc;
      }, {} as Record<string, number>)
    }));
    
    onInputChange("trait_definitions", dbFormat);
  }, [traitDefinitions, onInputChange]);

  const addTraitDefinition = () => {
    setTraitDefinitions(prev => [
      ...prev,
      {
        trait_name: "",
        trait_type: "string",
        possible_values: [
          { name: "", weight: 100 }
        ],
        is_required: false
      }
    ]);
  };

  const removeTraitDefinition = (index: number) => {
    setTraitDefinitions(prev => prev.filter((_, i) => i !== index));
  };

  const updateTraitDefinition = (index: number, field: keyof TraitDefinition, value: any) => {
    setTraitDefinitions(prev => prev.map((trait, i) => 
      i === index ? { ...trait, [field]: value } : trait
    ));
  };

  const addValue = (traitIndex: number) => {
    setTraitDefinitions(prev => prev.map((trait, i) => 
      i === traitIndex 
        ? { 
            ...trait, 
            possible_values: [...trait.possible_values, { name: "", weight: 50 }]
          }
        : trait
    ));
  };

  const removeValue = (traitIndex: number, valueIndex: number) => {
    setTraitDefinitions(prev => prev.map((trait, i) => 
      i === traitIndex 
        ? { 
            ...trait, 
            possible_values: trait.possible_values.filter((_, vi) => vi !== valueIndex)
          }
        : trait
    ));
  };

  const updateValue = (traitIndex: number, valueIndex: number, field: keyof TraitValue, value: any) => {
    setTraitDefinitions(prev => prev.map((trait, i) => 
      i === traitIndex 
        ? { 
            ...trait, 
            possible_values: trait.possible_values.map((val, vi) => 
              vi === valueIndex ? { ...val, [field]: value } : val
            )
          }
        : trait
    ));
  };

  const normalizeWeights = (traitIndex: number) => {
    const trait = traitDefinitions[traitIndex];
    const totalWeight = trait.possible_values.reduce((sum, val) => sum + val.weight, 0);
    
    if (totalWeight === 0) return;
    
    setTraitDefinitions(prev => prev.map((t, i) => 
      i === traitIndex 
        ? {
            ...t,
            possible_values: t.possible_values.map(val => ({
              ...val,
              weight: Math.round((val.weight / totalWeight) * 100)
            }))
          }
        : t
    ));
  };

  const applyEqualWeights = (traitIndex: number) => {
    const trait = traitDefinitions[traitIndex];
    const equalWeight = Math.round(100 / trait.possible_values.length);
    
    setTraitDefinitions(prev => prev.map((t, i) => 
      i === traitIndex 
        ? {
            ...t,
            possible_values: t.possible_values.map(val => ({
              ...val,
              weight: equalWeight
            }))
          }
        : t
    ));
  };

  // Calculate rarity percentage
  const getRarityPercentage = (trait: TraitDefinition, valueIndex: number): number => {
    const totalWeight = trait.possible_values.reduce((sum, val) => sum + val.weight, 0);
    if (totalWeight === 0) return 0;
    return Math.round((trait.possible_values[valueIndex].weight / totalWeight) * 100);
  };

  const getRarityLabel = (percentage: number): { label: string; color: string } => {
    if (percentage >= 50) return { label: "Common", color: "text-gray-600" };
    if (percentage >= 20) return { label: "Uncommon", color: "text-green-600" };
    if (percentage >= 10) return { label: "Rare", color: "text-blue-600" };
    if (percentage >= 5) return { label: "Epic", color: "text-purple-600" };
    if (percentage >= 1) return { label: "Legendary", color: "text-orange-600" };
    return { label: "Mythical", color: "text-red-600" };
  };

  // Predefined trait templates
  const traitTemplates = [
    {
      name: "Background",
      type: "string" as const,
      values: [
        { name: "Blue", weight: 30 },
        { name: "Green", weight: 25 },
        { name: "Red", weight: 20 },
        { name: "Purple", weight: 15 },
        { name: "Gold", weight: 8 },
        { name: "Rainbow", weight: 2 }
      ]
    },
    {
      name: "Rarity",
      type: "string" as const,
      values: [
        { name: "Common", weight: 60 },
        { name: "Uncommon", weight: 25 },
        { name: "Rare", weight: 10 },
        { name: "Epic", weight: 4 },
        { name: "Legendary", weight: 1 }
      ]
    },
    {
      name: "Power Level",
      type: "number" as const,
      values: [
        { name: "1-10", weight: 40 },
        { name: "11-25", weight: 30 },
        { name: "26-50", weight: 20 },
        { name: "51-75", weight: 8 },
        { name: "76-100", weight: 2 }
      ]
    }
  ];

  const applyTemplate = (index: number, template: typeof traitTemplates[0]) => {
    updateTraitDefinition(index, 'trait_name', template.name);
    updateTraitDefinition(index, 'trait_type', template.type);
    updateTraitDefinition(index, 'possible_values', template.values);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            Advanced Trait Definitions & Rarity
            <Tooltip>
              <TooltipTrigger className="ml-2">
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Define traits with rarity weights for procedural generation and marketplace rarity calculations.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Define traits with rarity distributions for your NFT collection. This enables procedural generation and accurate rarity rankings.
          </div>

          {/* Trait Templates */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-sm font-medium text-purple-900 mb-3">
              Trait Templates
              <Gamepad className="inline-block ml-2 h-4 w-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              {traitTemplates.map((template, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastTrait = traitDefinitions.length - 1;
                    applyTemplate(lastTrait, template);
                  }}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {traitDefinitions.map((trait, traitIndex) => (
            <div key={traitIndex} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Trait {traitIndex + 1}
                  </Badge>
                  {trait.is_required && (
                    <Badge variant="default" className="text-xs bg-blue-100 text-blue-800">
                      Required
                    </Badge>
                  )}
                </div>
                {traitDefinitions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTraitDefinition(traitIndex)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor={`traitName-${traitIndex}`}>
                    Trait Name *
                  </Label>
                  <Input
                    id={`traitName-${traitIndex}`}
                    placeholder="e.g., Background, Eyes"
                    value={trait.trait_name}
                    onChange={(e) => updateTraitDefinition(traitIndex, 'trait_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`traitType-${traitIndex}`}>
                    Data Type
                  </Label>
                  <Select 
                    value={trait.trait_type} 
                    onValueChange={(value: any) => updateTraitDefinition(traitIndex, 'trait_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">Text/String</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">True/False</SelectItem>
                      <SelectItem value="array">Multiple Values</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Required Trait</span>
                  <Switch
                    checked={trait.is_required}
                    onCheckedChange={(checked) => updateTraitDefinition(traitIndex, 'is_required', checked)}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Possible Values & Rarity Weights</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => applyEqualWeights(traitIndex)}
                      className="text-xs"
                    >
                      Equal Weights
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => normalizeWeights(traitIndex)}
                      className="text-xs"
                    >
                      Normalize to 100%
                    </Button>
                  </div>
                </div>
                
                {trait.possible_values.map((value, valueIndex) => {
                  const rarityPercentage = getRarityPercentage(trait, valueIndex);
                  const rarityInfo = getRarityLabel(rarityPercentage);
                  
                  return (
                    <div key={valueIndex} className="p-3 border rounded-md space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          Value {valueIndex + 1}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${rarityInfo.color}`}>
                            {rarityPercentage}% - {rarityInfo.label}
                          </Badge>
                          {trait.possible_values.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeValue(traitIndex, valueIndex)}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                            >
                              <Trash className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor={`valueName-${traitIndex}-${valueIndex}`}>
                            Value Name *
                          </Label>
                          <Input
                            id={`valueName-${traitIndex}-${valueIndex}`}
                            placeholder="e.g., Blue, Rare"
                            value={value.name}
                            onChange={(e) => updateValue(traitIndex, valueIndex, 'name', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`weight-${traitIndex}-${valueIndex}`} className="flex items-center">
                            Weight *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Higher weight = more common. Total doesn't need to equal 100.</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id={`weight-${traitIndex}-${valueIndex}`}
                            type="number"
                            min="0"
                            placeholder="50"
                            value={value.weight}
                            onChange={(e) => updateValue(traitIndex, valueIndex, 'weight', parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`description-${traitIndex}-${valueIndex}`}>
                            Description
                          </Label>
                          <Input
                            id={`description-${traitIndex}-${valueIndex}`}
                            placeholder="Optional description"
                            value={value.description || ""}
                            onChange={(e) => updateValue(traitIndex, valueIndex, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addValue(traitIndex)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Value
                </Button>
              </div>

              {/* Trait Preview */}
              {trait.trait_name && trait.possible_values.some(v => v.name.trim()) && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="text-sm font-medium mb-2">Trait Preview:</div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium">{trait.trait_name}</span>
                      <span className="text-muted-foreground ml-2">({trait.trait_type})</span>
                      {trait.is_required && <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {trait.possible_values
                        .filter(v => v.name.trim())
                        .map((value, idx) => {
                          const percentage = getRarityPercentage(trait, idx);
                          const rarity = getRarityLabel(percentage);
                          return (
                            <div key={idx} className="flex justify-between">
                              <span>{value.name}</span>
                              <span className={rarity.color}>{percentage}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addTraitDefinition}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Trait Definition
          </Button>

          {/* Summary */}
          {traitDefinitions.some(trait => trait.trait_name && trait.possible_values.some(v => v.name.trim())) && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-900 mb-2">
                Trait System Summary
              </div>
              <div className="text-sm text-purple-800 space-y-1">
                <div>Total Traits: {traitDefinitions.filter(t => t.trait_name && t.possible_values.some(v => v.name.trim())).length}</div>
                <div>Required Traits: {traitDefinitions.filter(t => t.is_required).length}</div>
                <div>Total Combinations: {traitDefinitions.reduce((acc, trait) => {
                  const validValues = trait.possible_values.filter(v => v.name.trim()).length;
                  return acc * (validValues || 1);
                }, 1).toLocaleString()}</div>
              </div>
              <div className="text-xs text-purple-700 mt-2">
                This trait system enables procedural NFT generation with rarity-based distribution.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC721TraitDefinitionsForm;
