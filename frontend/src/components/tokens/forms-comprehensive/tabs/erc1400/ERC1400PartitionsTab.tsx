import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import { tokenCRUDService } from '../../services/tokenCRUDService';
import { TokenERC1400PartitionsData } from '../../types';

interface ERC1400PartitionsTabProps {
  tokenId: string;
  configMode: 'min' | 'max';
  onSave?: (data: TokenERC1400PartitionsData[]) => void;
  onCancel?: () => void;
}

const ERC1400PartitionsTab: React.FC<ERC1400PartitionsTabProps> = ({
  tokenId,
  configMode,
  onSave,
  onCancel
}) => {
  const [partitions, setPartitions] = useState<TokenERC1400PartitionsData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPartitions();
  }, [tokenId]);

  const loadPartitions = async () => {
    try {
      setLoading(true);
      
      // Validate tokenId before making the query
      if (!tokenId || tokenId === 'undefined' || tokenId === 'null') {
        console.warn('Invalid tokenId provided to loadPartitions:', tokenId);
        setPartitions([]);
        return;
      }
      
      const data = await tokenCRUDService.getTableData('token_erc1400_partitions', tokenId);
      setPartitions((data as TokenERC1400PartitionsData[]) || []);
    } catch (error) {
      console.error('Error loading partitions:', error);
      setPartitions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartition = () => {
    const newPartition: TokenERC1400PartitionsData = {
      token_id: tokenId,
      name: '',
      partition_id: '',
      partition_type: '',
      metadata: {}
    };
    setPartitions([...partitions, newPartition]);
    setEditingId('new');
  };

  const handleEditPartition = (index: number) => {
    setEditingId(partitions[index].id || `temp-${index}`);
  };

  const handleSavePartition = async (index: number) => {
    try {
      setSaving(true);
      const partition = partitions[index];
      
      if (partition.id) {
        await tokenCRUDService.updateTableData('token_erc1400_partitions', partition.id, partition as any);
      } else {
        const saved = await tokenCRUDService.createTableData('token_erc1400_partitions', partition as any);
        const updatedPartitions = [...partitions];
        updatedPartitions[index] = saved as TokenERC1400PartitionsData;
        setPartitions(updatedPartitions);
      }
      
      setEditingId(null);
    } catch (error) {
      console.error('Error saving partition:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePartition = async (index: number) => {
    try {
      const partition = partitions[index];
      if (partition.id) {
        await tokenCRUDService.deleteTableRecord('token_erc1400_partitions', partition.id);
      }
      setPartitions(partitions.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error deleting partition:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    loadPartitions(); // Reload to reset any unsaved changes
  };

  const updatePartition = (index: number, field: keyof TokenERC1400PartitionsData, value: any) => {
    const updated = [...partitions];
    updated[index] = { ...updated[index], [field]: value };
    setPartitions(updated);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await tokenCRUDService.updateTableData('token_erc1400_partitions', tokenId, partitions);
      onSave?.(partitions);
    } catch (error) {
      console.error('Error saving all partitions:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading partitions...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Token Partitions</h3>
          <p className="text-sm text-muted-foreground">
            Manage token partitions for different share classes or investor groups
          </p>
        </div>
        <Button onClick={handleAddPartition} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Partition
        </Button>
      </div>

      {partitions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No partitions created yet</p>
            <Button onClick={handleAddPartition} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Partition
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {partitions.map((partition, index) => {
            const isEditing = editingId === (partition.id || `temp-${index}` || 'new');
            
            return (
              <Card key={partition.id || index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {isEditing ? (
                          <Input
                            value={partition.name || ''}
                            onChange={(e) => updatePartition(index, 'name', e.target.value)}
                            placeholder="Partition name"
                            className="font-medium"
                          />
                        ) : (
                          partition.name || `Partition ${index + 1}`
                        )}
                      </CardTitle>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline">{partition.partition_type || 'common'}</Badge>
                        {partition.transferable && <Badge variant="secondary">Transferable</Badge>}
                        {partition.corporate_actions && <Badge variant="secondary">Corporate Actions</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSavePartition(index)} disabled={saving}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEditPartition(index)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeletePartition(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Partition ID</Label>
                      {isEditing ? (
                        <Input
                          value={partition.partition_id || ''}
                          onChange={(e) => updatePartition(index, 'partition_id', e.target.value)}
                          placeholder="Enter partition ID"
                        />
                      ) : (
                        <div className="text-sm font-mono bg-muted p-2 rounded">
                          {partition.partition_id || 'Not set'}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Partition Type</Label>
                      {isEditing ? (
                        <Select
                          value={partition.partition_type || 'common'}
                          onValueChange={(value) => updatePartition(index, 'partition_type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Common</SelectItem>
                            <SelectItem value="preferred">Preferred</SelectItem>
                            <SelectItem value="restricted">Restricted</SelectItem>
                            <SelectItem value="bonus">Bonus</SelectItem>
                            <SelectItem value="treasury">Treasury</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm bg-muted p-2 rounded">
                          {partition.partition_type || 'common'}
                        </div>
                      )}
                    </div>
                  </div>

                  {configMode === 'max' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Total Supply</Label>
                          {isEditing ? (
                            <Input
                              value={partition.total_supply || ''}
                              onChange={(e) => updatePartition(index, 'total_supply', e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            <div className="text-sm bg-muted p-2 rounded">
                              {partition.total_supply || '0'}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Allocated Amount</Label>
                          {isEditing ? (
                            <Input
                              value={partition.amount || ''}
                              onChange={(e) => updatePartition(index, 'amount', e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            <div className="text-sm bg-muted p-2 rounded">
                              {partition.amount || '0'}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={partition.transferable || false}
                            onCheckedChange={(checked) => updatePartition(index, 'transferable', checked)}
                            disabled={!isEditing}
                          />
                          <Label>Transferable</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={partition.corporate_actions || false}
                            onCheckedChange={(checked) => updatePartition(index, 'corporate_actions', checked)}
                            disabled={!isEditing}
                          />
                          <Label>Corporate Actions Enabled</Label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Custom Features (JSON)</Label>
                        {isEditing ? (
                          <Textarea
                            value={JSON.stringify(partition.custom_features || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updatePartition(index, 'custom_features', parsed);
                              } catch (error) {
                                // Invalid JSON, keep the text value for editing
                              }
                            }}
                            placeholder="{}"
                            rows={3}
                          />
                        ) : (
                          <div className="text-sm bg-muted p-2 rounded font-mono">
                            {JSON.stringify(partition.custom_features || {}, null, 2)}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Metadata (JSON)</Label>
                        {isEditing ? (
                          <Textarea
                            value={JSON.stringify(partition.metadata || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                updatePartition(index, 'metadata', parsed);
                              } catch (error) {
                                // Invalid JSON, keep the text value for editing
                              }
                            }}
                            placeholder="{}"
                            rows={3}
                          />
                        ) : (
                          <div className="text-sm bg-muted p-2 rounded font-mono">
                            {JSON.stringify(partition.metadata || {}, null, 2)}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
};

export default ERC1400PartitionsTab;