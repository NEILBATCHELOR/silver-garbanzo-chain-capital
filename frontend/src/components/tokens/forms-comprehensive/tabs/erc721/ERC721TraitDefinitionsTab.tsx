// ERC721 Trait Definitions Tab Component
// Handles token_erc721_trait_definitions table for NFT trait configuration

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Plus, Trash2, Edit2, Save, X, Palette, Star } from 'lucide-react';

import { TokenERC721TraitDefinitionsData, ConfigMode } from '../../types';

interface ERC721TraitDefinitionsTabProps {
  data: TokenERC721TraitDefinitionsData | TokenERC721TraitDefinitionsData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const ERC721TraitDefinitionsTab: React.FC<ERC721TraitDefinitionsTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting
}) => {
  const traitsData = Array.isArray(data) ? data : [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newTrait, setNewTrait] = useState<Partial<TokenERC721TraitDefinitionsData>>({});

  const handleAddTrait = () => {
    const newIndex = traitsData.length;
    const traitToAdd = {
      trait_name: newTrait.trait_name || '',
      trait_type: newTrait.trait_type || 'string',
      possible_values: newTrait.possible_values || [],
      rarity_weights: newTrait.rarity_weights || {},
      is_required: newTrait.is_required || false
    };

    onFieldChange('new_record', traitToAdd, newIndex);
    setNewTrait({});
  };

  const handleUpdateTrait = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleDeleteTrait = (index: number) => {
    onFieldChange('_deleted', true, index);
  };

  const getFieldError = (index: number, field: string): string[] => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string): boolean => {
    return getFieldError(index, field).length > 0;
  };

  const handlePossibleValuesChange = (index: number, valuesString: string) => {
    const values = valuesString.split(',').map(v => v.trim()).filter(v => v);
    handleUpdateTrait(index, 'possible_values', values);
  };

  const handleNewPossibleValuesChange = (valuesString: string) => {
    const values = valuesString.split(',').map(v => v.trim()).filter(v => v);
    setNewTrait(prev => ({ ...prev, possible_values: values }));
  };

  const handleRarityWeightsChange = (index: number, weightsString: string) => {
    try {
      const weights = weightsString ? JSON.parse(weightsString) : {};
      handleUpdateTrait(index, 'rarity_weights', weights);
    } catch (error) {
      // Invalid JSON, keep current value
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Trait Definitions
            </div>
            <Badge variant="outline">{traitsData.length} traits</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Define the traits that will be used to generate your NFT collection. Traits determine
            the possible variations of your NFTs and their rarity distribution.
          </p>
        </CardContent>
      </Card>

      {/* Add New Trait */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Trait</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_trait_name" className="text-sm font-medium">
                Trait Name *
              </Label>
              <Input
                id="new_trait_name"
                value={newTrait.trait_name || ''}
                onChange={(e) => setNewTrait(prev => ({ ...prev, trait_name: e.target.value }))}
                placeholder="e.g., Background, Eyes, Clothing"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_trait_type" className="text-sm font-medium">
                Trait Type *
              </Label>
              <Select
                value={newTrait.trait_type || 'string'}
                onValueChange={(value) => setNewTrait(prev => ({ ...prev, trait_type: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">Text/String</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="rarity">Rarity Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="new_possible_values" className="text-sm font-medium">
                Possible Values (comma-separated)
              </Label>
              <Input
                id="new_possible_values"
                value={newTrait.possible_values?.join(', ') || ''}
                onChange={(e) => handleNewPossibleValuesChange(e.target.value)}
                placeholder="e.g., Red, Blue, Green, Yellow"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                List all possible values for this trait, separated by commas
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="new_is_required"
                checked={newTrait.is_required || false}
                onCheckedChange={(checked) => setNewTrait(prev => ({ ...prev, is_required: checked }))}
                disabled={isSubmitting}
              />
              <Label htmlFor="new_is_required" className="text-sm">Required Trait</Label>
            </div>

            <Button
              onClick={handleAddTrait}
              disabled={!newTrait.trait_name || isSubmitting}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Trait
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Traits List */}
      <Card>
        <CardHeader>
          <CardTitle>Defined Traits</CardTitle>
        </CardHeader>
        <CardContent>
          {traitsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No traits defined yet. Add your first trait above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trait Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Possible Values</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Rarity Weights</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {traitsData.map((trait, index) => (
                  <TableRow key={index} className={trait._deleted ? 'opacity-50 line-through' : ''}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={trait.trait_name || ''}
                          onChange={(e) => handleUpdateTrait(index, 'trait_name', e.target.value)}
                          className={hasFieldError(index, 'trait_name') ? 'border-red-500' : ''}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <div className="space-y-1">
                          <span className="font-medium">{trait.trait_name}</span>
                          {hasFieldError(index, 'trait_name') && (
                            <div className="text-xs text-red-500">
                              {getFieldError(index, 'trait_name').join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={trait.trait_type || 'string'}
                          onValueChange={(value) => handleUpdateTrait(index, 'trait_type', value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Text/String</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="rarity">Rarity Level</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          {trait.trait_type}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={trait.possible_values?.join(', ') || ''}
                          onChange={(e) => handlePossibleValuesChange(index, e.target.value)}
                          placeholder="value1, value2, value3"
                          disabled={isSubmitting}
                        />
                      ) : (
                        <div className="max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {trait.possible_values?.slice(0, 3).map((value, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {value}
                              </Badge>
                            ))}
                            {trait.possible_values && trait.possible_values.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{trait.possible_values.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Switch
                          checked={trait.is_required || false}
                          onCheckedChange={(checked) => handleUpdateTrait(index, 'is_required', checked)}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Badge variant={trait.is_required ? "default" : "secondary"}>
                          {trait.is_required ? 'Required' : 'Optional'}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Textarea
                          value={JSON.stringify(trait.rarity_weights || {}, null, 2)}
                          onChange={(e) => handleRarityWeightsChange(index, e.target.value)}
                          placeholder='{"Common": 70, "Rare": 25, "Epic": 5}'
                          disabled={isSubmitting}
                          rows={3}
                          className="font-mono text-xs"
                        />
                      ) : (
                        <div className="max-w-xs">
                          {trait.rarity_weights && Object.keys(trait.rarity_weights).length > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              <span className="text-xs">
                                {Object.keys(trait.rarity_weights).length} weights
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No weights</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {editingIndex === index ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingIndex(null)}
                              disabled={isSubmitting}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingIndex(null)}
                              disabled={isSubmitting}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingIndex(index)}
                              disabled={isSubmitting || trait._deleted}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTrait(index)}
                              disabled={isSubmitting || trait._deleted}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Advanced Configuration (Max Mode) */}
      {configMode === 'max' && traitsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Trait Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Rarity Weight System</Label>
                <p className="text-xs text-muted-foreground">
                  Define how rare each trait value should be using percentage weights.
                  Higher numbers = more common, lower numbers = more rare.
                </p>
                <div className="text-sm bg-muted p-3 rounded-lg font-mono">
                  {`{
  "Common": 70,
  "Uncommon": 20,
  "Rare": 8,
  "Epic": 2
}`}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Trait Combination Rules</Label>
                <p className="text-xs text-muted-foreground">
                  Consider trait interactions when defining your collection. Some traits may be
                  incompatible or have special combinations.
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Ensure total rarity weights add up to 100 for predictable distribution.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Generation Preview</Label>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground mb-2">
                    Total possible combinations: {
                      traitsData.reduce((total, trait) => {
                        const values = trait.possible_values?.length || 1;
                        return total * (trait.is_required ? values : values + 1); // +1 for optional traits
                      }, 1).toLocaleString()
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Required traits: {traitsData.filter(t => t.is_required).length} | 
                    Optional traits: {traitsData.filter(t => !t.is_required).length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Trait Definitions:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
          <Badge variant="outline">
            {traitsData.filter(trait => !trait._deleted).length} active
          </Badge>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onValidate}
          disabled={isSubmitting}
        >
          Validate
        </Button>
      </div>
    </div>
  );
};

export default ERC721TraitDefinitionsTab;
