// ERC721 Attributes Tab Component
// Handles token_erc721_attributes table for NFT attribute definitions

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
import { AlertTriangle, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

import { TokenERC721AttributesData, ConfigMode } from '../../types';

interface ERC721AttributesTabProps {
  data: TokenERC721AttributesData | TokenERC721AttributesData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const ERC721AttributesTab: React.FC<ERC721AttributesTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting
}) => {
  const attributesData = Array.isArray(data) ? data : [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newAttribute, setNewAttribute] = useState<Partial<TokenERC721AttributesData>>({});

  const handleAddAttribute = () => {
    const newIndex = attributesData.length;
    const attributeToAdd = {
      attribute_name: newAttribute.attribute_name || '',
      attribute_type: newAttribute.attribute_type || 'string',
      is_required: newAttribute.is_required || false,
      default_value: newAttribute.default_value || '',
      display_order: newIndex + 1,
      validation_rules: newAttribute.validation_rules || {}
    };

    onFieldChange('new_record', attributeToAdd, newIndex);
    setNewAttribute({});
  };

  const handleUpdateAttribute = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleDeleteAttribute = (index: number) => {
    // Mark for deletion by setting a deletion flag
    onFieldChange('_deleted', true, index);
  };

  const getFieldError = (index: number, field: string): string[] => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string): boolean => {
    return getFieldError(index, field).length > 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            NFT Attributes
            <Badge variant="outline">{attributesData.length} attributes</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Define the attributes that will be part of your NFT metadata. These attributes
            will be displayed on marketplaces and can be used for filtering and searching.
          </p>
        </CardContent>
      </Card>

      {/* Add New Attribute */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Attribute</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_attribute_name" className="text-sm font-medium">
                Attribute Name *
              </Label>
              <Input
                id="new_attribute_name"
                value={newAttribute.attribute_name || ''}
                onChange={(e) => setNewAttribute(prev => ({ ...prev, attribute_name: e.target.value }))}
                placeholder="e.g., Background, Rarity"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_attribute_type" className="text-sm font-medium">
                Type *
              </Label>
              <Select
                value={newAttribute.attribute_type || 'string'}
                onValueChange={(value) => setNewAttribute(prev => ({ ...prev, attribute_type: value }))}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="color">Color</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_default_value" className="text-sm font-medium">
                Default Value
              </Label>
              <Input
                id="new_default_value"
                value={newAttribute.default_value || ''}
                onChange={(e) => setNewAttribute(prev => ({ ...prev, default_value: e.target.value }))}
                placeholder="Optional default value"
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-end space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="new_is_required"
                  checked={newAttribute.is_required || false}
                  onCheckedChange={(checked) => setNewAttribute(prev => ({ ...prev, is_required: checked }))}
                  disabled={isSubmitting}
                />
                <Label htmlFor="new_is_required" className="text-sm">Required</Label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleAddAttribute}
            disabled={!newAttribute.attribute_name || isSubmitting}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Attribute
          </Button>
        </CardContent>
      </Card>

      {/* Attributes List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          {attributesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attributes defined yet. Add your first attribute above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Display Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributesData.map((attribute, index) => (
                  <TableRow key={index} className={attribute._deleted ? 'opacity-50 line-through' : ''}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={attribute.attribute_name || ''}
                          onChange={(e) => handleUpdateAttribute(index, 'attribute_name', e.target.value)}
                          className={hasFieldError(index, 'attribute_name') ? 'border-red-500' : ''}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <div className="space-y-1">
                          <span className="font-medium">{attribute.attribute_name}</span>
                          {hasFieldError(index, 'attribute_name') && (
                            <div className="text-xs text-red-500">
                              {getFieldError(index, 'attribute_name').join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Select
                          value={attribute.attribute_type || 'string'}
                          onValueChange={(value) => handleUpdateAttribute(index, 'attribute_type', value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="boolean">Boolean</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="color">Color</SelectItem>
                            <SelectItem value="url">URL</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">
                          {attribute.attribute_type}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Switch
                          checked={attribute.is_required || false}
                          onCheckedChange={(checked) => handleUpdateAttribute(index, 'is_required', checked)}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Badge variant={attribute.is_required ? "default" : "secondary"}>
                          {attribute.is_required ? 'Required' : 'Optional'}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={attribute.default_value || ''}
                          onChange={(e) => handleUpdateAttribute(index, 'default_value', e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Default value"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {attribute.default_value || '-'}
                        </span>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          min="1"
                          value={attribute.display_order || index + 1}
                          onChange={(e) => handleUpdateAttribute(index, 'display_order', parseInt(e.target.value))}
                          disabled={isSubmitting}
                          className="w-20"
                        />
                      ) : (
                        <span className="text-sm">{attribute.display_order || index + 1}</span>
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
                              disabled={isSubmitting || attribute._deleted}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteAttribute(index)}
                              disabled={isSubmitting || attribute._deleted}
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
      {configMode === 'max' && attributesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Attribute Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Validation Rules</Label>
                <p className="text-xs text-muted-foreground">
                  JSON configuration for attribute validation (e.g., min/max values, regex patterns)
                </p>
                <div className="text-sm bg-muted p-3 rounded-lg font-mono">
                  {`{
  "minLength": 3,
  "maxLength": 50,
  "pattern": "^[a-zA-Z0-9 ]+$"
}`}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Display Configuration</Label>
                <p className="text-xs text-muted-foreground">
                  Control how attributes are displayed in marketplaces and applications
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch id="show_in_preview" />
                    <Label htmlFor="show_in_preview" className="text-sm">Show in Preview</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="searchable" />
                    <Label htmlFor="searchable" className="text-sm">Searchable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="filterable" />
                    <Label htmlFor="filterable" className="text-sm">Filterable</Label>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">ERC-721 Attributes:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
          <Badge variant="outline">{attributesData.filter(attr => !attr._deleted).length} active</Badge>
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

export default ERC721AttributesTab;
