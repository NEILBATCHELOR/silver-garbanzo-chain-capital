// ERC-1155 Crafting Recipes Tab - Gaming Mechanics
// Comprehensive crafting system for gaming tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Trash2, 
  Hammer,
  Zap,
  Clock,
  Star,
  Settings
} from 'lucide-react';

import { TokenERC1155CraftingRecipesData, ConfigMode } from '../../types';

interface ERC1155CraftingRecipesTabProps {
  data?: TokenERC1155CraftingRecipesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155CraftingRecipesTab: React.FC<ERC1155CraftingRecipesTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addNewRecipe = () => {
    const newRecipe: TokenERC1155CraftingRecipesData = {
      recipe_name: '',
      input_tokens: {},
      output_token_type_id: '',
      output_quantity: 1,
      success_rate: 100,
      cooldown_period: 0,
      required_level: 0,
      is_active: true
    };
    
    onFieldChange('newRecord', newRecipe, data.length);
    setExpandedIndex(data.length);
  };

  const removeRecipe = (index: number) => {
    if (confirm('Are you sure you want to remove this crafting recipe?')) {
      onFieldChange('removeRecord', null, index);
      if (expandedIndex === index) setExpandedIndex(null);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleInputTokensChange = (index: number, inputTokensStr: string) => {
    try {
      const inputTokens = inputTokensStr ? JSON.parse(inputTokensStr) : {};
      handleFieldChange(index, 'input_tokens', inputTokens);
    } catch (error) {
      // Invalid JSON, store as string for now
      handleFieldChange(index, 'input_tokens', inputTokensStr);
    }
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  if (configMode === 'min') {
    // Basic mode - simplified crafting
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Hammer className="w-5 h-5" />
                Crafting Recipes ({data.length})
              </CardTitle>
              <Button onClick={addNewRecipe} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Recipe
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((recipe, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Recipe Name</Label>
                        <Input
                          value={recipe.recipe_name || ''}
                          onChange={(e) => handleFieldChange(index, 'recipe_name', e.target.value)}
                          placeholder="Craft Sword"
                        />
                      </div>
                      
                      <div>
                        <Label>Output Token Type</Label>
                        <Input
                          value={recipe.output_token_type_id || ''}
                          onChange={(e) => handleFieldChange(index, 'output_token_type_id', e.target.value)}
                          placeholder="1"
                        />
                      </div>

                      <div>
                        <Label>Output Quantity</Label>
                        <Input
                          type="number"
                          value={recipe.output_quantity || 1}
                          onChange={(e) => handleFieldChange(index, 'output_quantity', parseInt(e.target.value) || 1)}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Input Tokens (JSON: {`{"tokenId": quantity}`})</Label>
                      <Textarea
                        value={
                          typeof recipe.input_tokens === 'object' 
                            ? JSON.stringify(recipe.input_tokens, null, 2)
                            : recipe.input_tokens || ''
                        }
                        onChange={(e) => handleInputTokensChange(index, e.target.value)}
                        placeholder='{"1": 2, "2": 1}'
                        rows={3}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeRecipe(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No crafting recipes defined. Click "Add Recipe" to create game mechanics.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Advanced mode - full crafting system
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hammer className="w-5 h-5" />
              Crafting Recipes & Game Mechanics ({data.length})
            </CardTitle>
            <Button onClick={addNewRecipe} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add New Recipe
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((recipe, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hammer className="w-4 h-4" />
                      <span className="font-medium">
                        {recipe.recipe_name || `Recipe ${index + 1}`}
                      </span>
                      {recipe.is_active && <Badge variant="default">Active</Badge>}
                      {!recipe.is_active && <Badge variant="secondary">Inactive</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeRecipe(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Basic Recipe Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`recipe_name_${index}`}>Recipe Name *</Label>
                      <Input
                        id={`recipe_name_${index}`}
                        value={recipe.recipe_name || ''}
                        onChange={(e) => handleFieldChange(index, 'recipe_name', e.target.value)}
                        placeholder="Craft Legendary Sword"
                      />
                      {hasFieldError(index, 'recipe_name') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'recipe_name').join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor={`is_active_${index}`}>Recipe Active</Label>
                      <Switch
                        id={`is_active_${index}`}
                        checked={recipe.is_active !== false}
                        onCheckedChange={(checked) => handleFieldChange(index, 'is_active', checked)}
                      />
                    </div>
                  </div>

                  {/* Input Tokens */}
                  <div className="mb-4">
                    <Label htmlFor={`input_tokens_${index}`}>Input Tokens (JSON) *</Label>
                    <Textarea
                      id={`input_tokens_${index}`}
                      value={
                        typeof recipe.input_tokens === 'object' 
                          ? JSON.stringify(recipe.input_tokens, null, 2)
                          : recipe.input_tokens || ''
                      }
                      onChange={(e) => handleInputTokensChange(index, e.target.value)}
                      placeholder={`{
  "1": 2,
  "3": 1,
  "5": 3
}`}
                      rows={4}
                      className="font-mono text-sm"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Format: {`{"tokenTypeId": quantity, "tokenTypeId": quantity}`}
                    </div>
                    {hasFieldError(index, 'input_tokens') && (
                      <div className="text-sm text-red-500 mt-1">
                        {getFieldError(index, 'input_tokens').join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Output Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`output_token_type_id_${index}`}>Output Token Type *</Label>
                      <Input
                        id={`output_token_type_id_${index}`}
                        value={recipe.output_token_type_id || ''}
                        onChange={(e) => handleFieldChange(index, 'output_token_type_id', e.target.value)}
                        placeholder="10"
                      />
                      {hasFieldError(index, 'output_token_type_id') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'output_token_type_id').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`output_quantity_${index}`}>Output Quantity</Label>
                      <Input
                        id={`output_quantity_${index}`}
                        type="number"
                        value={recipe.output_quantity || 1}
                        onChange={(e) => handleFieldChange(index, 'output_quantity', parseInt(e.target.value) || 1)}
                        placeholder="1"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  {expandedIndex === index && (
                    <div className="space-y-4 pt-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor={`success_rate_${index}`}>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4" />
                              Success Rate (%)
                            </div>
                          </Label>
                          <Input
                            id={`success_rate_${index}`}
                            type="number"
                            value={recipe.success_rate || 100}
                            onChange={(e) => handleFieldChange(index, 'success_rate', parseInt(e.target.value) || 100)}
                            placeholder="100"
                            min="1"
                            max="100"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`cooldown_period_${index}`}>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Cooldown (seconds)
                            </div>
                          </Label>
                          <Input
                            id={`cooldown_period_${index}`}
                            type="number"
                            value={recipe.cooldown_period || 0}
                            onChange={(e) => handleFieldChange(index, 'cooldown_period', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                          />
                        </div>

                        <div>
                          <Label htmlFor={`required_level_${index}`}>
                            <div className="flex items-center gap-1">
                              <Zap className="w-4 h-4" />
                              Required Level
                            </div>
                          </Label>
                          <Input
                            id={`required_level_${index}`}
                            type="number"
                            value={recipe.required_level || 0}
                            onChange={(e) => handleFieldChange(index, 'required_level', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Quick Recipe Templates */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Quick Templates</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleInputTokensChange(index, '{"1": 2, "2": 1}');
                                handleFieldChange(index, 'output_token_type_id', '10');
                                handleFieldChange(index, 'success_rate', 90);
                              }}
                            >
                              Basic Craft
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleInputTokensChange(index, '{"1": 5, "2": 3, "3": 1}');
                                handleFieldChange(index, 'output_token_type_id', '20');
                                handleFieldChange(index, 'success_rate', 70);
                                handleFieldChange(index, 'required_level', 10);
                              }}
                            >
                              Advanced Craft
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                handleInputTokensChange(index, '{"10": 2, "20": 1}');
                                handleFieldChange(index, 'output_token_type_id', '50');
                                handleFieldChange(index, 'success_rate', 50);
                                handleFieldChange(index, 'required_level', 25);
                                handleFieldChange(index, 'cooldown_period', 3600);
                              }}
                            >
                              Legendary Craft
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Summary when collapsed */}
                  {expandedIndex !== index && (
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>Output: Type {recipe.output_token_type_id} x{recipe.output_quantity}</span>
                        <span>Success: {recipe.success_rate || 100}%</span>
                        {(recipe.required_level || 0) > 0 && (
                          <span>Level: {recipe.required_level}</span>
                        )}
                        {(recipe.cooldown_period || 0) > 0 && (
                          <span>Cooldown: {recipe.cooldown_period}s</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Hammer className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Crafting Recipes</h3>
                  <p className="text-muted-foreground mb-4">
                    Create crafting recipes to enable game mechanics and token combinations.
                  </p>
                  <Button onClick={addNewRecipe}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Recipe
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          {isModified && <Badge variant="outline">Modified</Badge>}
          <span className="text-sm text-muted-foreground">
            ERC-1155 Crafting Recipes Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate Recipes
        </Button>
      </div>
    </div>
  );
};

export default ERC1155CraftingRecipesTab;