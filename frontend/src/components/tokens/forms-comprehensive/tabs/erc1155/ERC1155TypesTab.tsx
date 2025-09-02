// ERC-1155 Types Tab - Token Type Definitions
// Comprehensive management of ERC-1155 token types

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Save,
  X,
  Database,
  Hash,
  FileText,
  Settings
} from 'lucide-react';

import { TokenERC1155TypesData, ConfigMode } from '../../types';

interface ERC1155TypesTabProps {
  data?: TokenERC1155TypesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155TypesTab: React.FC<ERC1155TypesTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const addNewType = () => {
    const newType: TokenERC1155TypesData = {
      token_type_id: `${data.length + 1}`,
      name: '',
      description: '',
      max_supply: '',
      fungibility_type: 'non-fungible',
      metadata: {}
    };
    
    onFieldChange('newRecord', newType, data.length);
    setEditingIndex(data.length);
    setExpandedIndex(data.length);
  };

  const removeType = (index: number) => {
    if (confirm('Are you sure you want to remove this token type?')) {
      onFieldChange('removeRecord', null, index);
      if (editingIndex === index) setEditingIndex(null);
      if (expandedIndex === index) setExpandedIndex(null);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleMetadataChange = (index: number, metadataStr: string) => {
    try {
      const metadata = metadataStr ? JSON.parse(metadataStr) : {};
      handleFieldChange(index, 'metadata', metadata);
    } catch (error) {
      // Invalid JSON, store as string for now
      handleFieldChange(index, 'metadata', metadataStr);
    }
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  if (configMode === 'min') {
    // Basic mode - simplified view
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Token Types ({data.length})
              </CardTitle>
              <Button onClick={addNewType} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Type
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((tokenType, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Type ID</Label>
                        <Input
                          value={tokenType.token_type_id || ''}
                          onChange={(e) => handleFieldChange(index, 'token_type_id', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={tokenType.name || ''}
                          onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                          placeholder="Sword"
                        />
                      </div>

                      <div>
                        <Label>Max Supply</Label>
                        <Input
                          value={tokenType.max_supply || ''}
                          onChange={(e) => handleFieldChange(index, 'max_supply', e.target.value)}
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label>Description</Label>
                      <Textarea
                        value={tokenType.description || ''}
                        onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                        placeholder="Token type description..."
                        rows={2}
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeType(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No token types defined. Click "Add Type" to create your first token type.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Advanced mode - full feature set
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Token Types Management ({data.length})
            </CardTitle>
            <Button onClick={addNewType} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add New Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((tokenType, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-medium">
                        Type {tokenType.token_type_id} - {tokenType.name || 'Unnamed'}
                      </span>
                      <Badge variant="outline">
                        {tokenType.fungibility_type || 'non-fungible'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                      >
                        {expandedIndex === index ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeType(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Always visible basic info */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label htmlFor={`type_id_${index}`}>Type ID *</Label>
                      <Input
                        id={`type_id_${index}`}
                        value={tokenType.token_type_id || ''}
                        onChange={(e) => handleFieldChange(index, 'token_type_id', e.target.value)}
                        placeholder="1"
                      />
                      {hasFieldError(index, 'token_type_id') && (
                        <div className="text-sm text-red-500 mt-1">
                          {getFieldError(index, 'token_type_id').join(', ')}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`name_${index}`}>Name</Label>
                      <Input
                        id={`name_${index}`}
                        value={tokenType.name || ''}
                        onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                        placeholder="Legendary Sword"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`max_supply_${index}`}>Max Supply</Label>
                      <Input
                        id={`max_supply_${index}`}
                        value={tokenType.max_supply || ''}
                        onChange={(e) => handleFieldChange(index, 'max_supply', e.target.value)}
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`fungibility_type_${index}`}>Fungibility Type</Label>
                      <Select 
                        value={tokenType.fungibility_type || 'non-fungible'} 
                        onValueChange={(value) => handleFieldChange(index, 'fungibility_type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="non-fungible">Non-Fungible</SelectItem>
                          <SelectItem value="semi-fungible">Semi-Fungible</SelectItem>
                          <SelectItem value="fungible">Fungible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Expandable detailed configuration */}
                  {expandedIndex === index && (
                    <div className="space-y-4 pt-4 border-t">
                      <div>
                        <Label htmlFor={`description_${index}`}>Description</Label>
                        <Textarea
                          id={`description_${index}`}
                          value={tokenType.description || ''}
                          onChange={(e) => handleFieldChange(index, 'description', e.target.value)}
                          placeholder="Detailed description of this token type..."
                          rows={3}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`metadata_${index}`}>Metadata (JSON)</Label>
                        <Textarea
                          id={`metadata_${index}`}
                          value={
                            typeof tokenType.metadata === 'object' 
                              ? JSON.stringify(tokenType.metadata, null, 2)
                              : tokenType.metadata || ''
                          }
                          onChange={(e) => handleMetadataChange(index, e.target.value)}
                          placeholder={`{
  "image": "https://example.com/image.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Attack",
      "value": 100
    }
  ]
}`}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Enter valid JSON metadata for this token type
                        </div>
                      </div>

                      {/* Metadata helpers */}
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Quick Metadata Templates
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const basicMetadata = {
                                  name: tokenType.name || `Token ${tokenType.token_type_id}`,
                                  description: tokenType.description || '',
                                  image: '',
                                  attributes: []
                                };
                                handleFieldChange(index, 'metadata', basicMetadata);
                              }}
                            >
                              Basic NFT
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const gameItemMetadata = {
                                  name: tokenType.name || `Game Item ${tokenType.token_type_id}`,
                                  description: tokenType.description || '',
                                  image: '',
                                  attributes: [
                                    { trait_type: 'Rarity', value: 'Common' },
                                    { trait_type: 'Type', value: 'Weapon' },
                                    { trait_type: 'Level', value: 1 }
                                  ],
                                  stats: {
                                    attack: 10,
                                    defense: 5,
                                    durability: 100
                                  }
                                };
                                handleFieldChange(index, 'metadata', gameItemMetadata);
                              }}
                            >
                              Game Item
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const collectibleMetadata = {
                                  name: tokenType.name || `Collectible ${tokenType.token_type_id}`,
                                  description: tokenType.description || '',
                                  image: '',
                                  attributes: [
                                    { trait_type: 'Series', value: 'Genesis' },
                                    { trait_type: 'Edition', value: '1 of 100' }
                                  ],
                                  external_url: '',
                                  background_color: ''
                                };
                                handleFieldChange(index, 'metadata', collectibleMetadata);
                              }}
                            >
                              Collectible
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Summary when collapsed */}
                  {expandedIndex !== index && (
                    <div className="text-sm text-muted-foreground">
                      {tokenType.description && (
                        <p className="truncate">{tokenType.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-1">
                        <span>Max Supply: {tokenType.max_supply || 'Unlimited'}</span>
                        <span>Type: {tokenType.fungibility_type || 'non-fungible'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Token Types Defined</h3>
                  <p className="text-muted-foreground mb-4">
                    Create token types to define the different kinds of tokens in your ERC-1155 collection.
                  </p>
                  <Button onClick={addNewType}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Token Type
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
            ERC-1155 Token Types Configuration
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate All Types
        </Button>
      </div>
    </div>
  );
};

export default ERC1155TypesTab;