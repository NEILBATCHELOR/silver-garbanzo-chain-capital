import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Save, X, Shield } from 'lucide-react';
import { tokenCRUDService } from '../../services/tokenCRUDService';
import { TokenERC1400ControllersData } from '../../types';

interface ERC1400ControllersTabProps {
  tokenId: string;
  configMode: 'min' | 'max';
  onSave?: (data: TokenERC1400ControllersData[]) => void;
  onCancel?: () => void;
}

const AVAILABLE_PERMISSIONS = [
  'force_transfer',
  'mint',
  'burn',
  'pause',
  'freeze_account',
  'update_documents',
  'manage_partitions',
  'compliance_override',
  'redemption',
  'corporate_actions'
];

const ERC1400ControllersTab: React.FC<ERC1400ControllersTabProps> = ({
  tokenId,
  configMode,
  onSave,
  onCancel
}) => {
  const [controllers, setControllers] = useState<TokenERC1400ControllersData[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadControllers();
  }, [tokenId]);

  const loadControllers = async () => {
    try {
      setLoading(true);
      
      // Validate tokenId before making the query
      if (!tokenId || tokenId === 'undefined' || tokenId === 'null') {
        console.warn('Invalid tokenId provided to loadControllers:', tokenId);
        setControllers([]);
        return;
      }
      
      const data = await tokenCRUDService.getTableData('token_erc1400_controllers', tokenId);
      setControllers((data as TokenERC1400ControllersData[]) || []);
    } catch (error) {
      console.error('Error loading controllers:', error);
      setControllers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddController = () => {
    const newController: TokenERC1400ControllersData = {
      token_id: tokenId,
      controller_address: '',
      controller_type: 'operator',
      permissions: [],
      is_active: true
    };
    setControllers([...controllers, newController]);
    setEditingId('new');
  };

  const handleEditController = (index: number) => {
    setEditingId(controllers[index].id || `temp-${index}`);
  };

  const handleSaveController = async (index: number) => {
    try {
      setSaving(true);
      const controller = controllers[index];
      
      if (controller.id) {
        const result = await tokenCRUDService.updateTableData('token_erc1400_controllers', tokenId, [controller]);
        const updatedControllers = [...controllers];
        updatedControllers[index] = result[0] as TokenERC1400ControllersData;
        setControllers(updatedControllers);
      } else {
        const saved = await tokenCRUDService.createTableData('token_erc1400_controllers', controller);
        const updatedControllers = [...controllers];
        updatedControllers[index] = saved as TokenERC1400ControllersData;
        setControllers(updatedControllers);
      }
      
      setEditingId(null);
    } catch (error) {
      console.error('Error saving controller:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteController = async (index: number) => {
    try {
      const controller = controllers[index];
      if (controller.id) {
        await tokenCRUDService.deleteTableRecord('token_erc1400_controllers', controller.id);
      }
      setControllers(controllers.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error deleting controller:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    loadControllers();
  };

  const updateController = (index: number, field: keyof TokenERC1400ControllersData, value: any) => {
    const updated = [...controllers];
    updated[index] = { ...updated[index], [field]: value };
    setControllers(updated);
  };

  const togglePermission = (controllerIndex: number, permission: string) => {
    const controller = controllers[controllerIndex];
    const currentPermissions = controller.permissions || [];
    
    let newPermissions: string[];
    if (currentPermissions.includes(permission)) {
      newPermissions = currentPermissions.filter(p => p !== permission);
    } else {
      newPermissions = [...currentPermissions, permission];
    }
    
    updateController(controllerIndex, 'permissions', newPermissions);
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      await tokenCRUDService.updateTableData('token_erc1400_controllers', tokenId, controllers);
      onSave?.(controllers);
    } catch (error) {
      console.error('Error saving all controllers:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">Loading controllers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Access Controllers</h3>
          <p className="text-sm text-muted-foreground">
            Manage addresses that have special control permissions for this security token
          </p>
        </div>
        <Button onClick={handleAddController} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Controller
        </Button>
      </div>

      {controllers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No controllers configured yet</p>
            <Button onClick={handleAddController} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Add First Controller
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {controllers.map((controller, index) => {
            const isEditing = editingId === (controller.id || `temp-${index}` || 'new');
            
            return (
              <Card key={controller.id || index}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Controller {index + 1}
                      </CardTitle>
                      <div className="mt-2">
                        {isEditing ? (
                          <Input
                            value={controller.controller_address || ''}
                            onChange={(e) => updateController(index, 'controller_address', e.target.value)}
                            placeholder="0x..."
                            className="font-mono"
                          />
                        ) : (
                          <div className="text-sm font-mono bg-muted p-2 rounded">
                            {controller.controller_address || 'Address not set'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button size="sm" onClick={() => handleSaveController(index)} disabled={saving}>
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleEditController(index)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteController(index)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Permissions</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                      {AVAILABLE_PERMISSIONS.map((permission) => {
                        const hasPermission = (controller.permissions || []).includes(permission);
                        return (
                          <div key={permission} className="flex items-center space-x-2">
                            {isEditing ? (
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={hasPermission}
                                  onChange={() => togglePermission(index, permission)}
                                  className="rounded"
                                />
                                <span className="text-sm">{permission.replace(/_/g, ' ')}</span>
                              </label>
                            ) : (
                              <Badge 
                                variant={hasPermission ? "default" : "secondary"}
                                className={hasPermission ? "" : "opacity-50"}
                              >
                                {permission.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {configMode === 'max' && !isEditing && (
                    <div className="pt-2 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Created</Label>
                          <div>{controller.created_at ? new Date(controller.created_at).toLocaleDateString() : 'Not set'}</div>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Last Updated</Label>
                          <div>{controller.updated_at ? new Date(controller.updated_at).toLocaleDateString() : 'Not set'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {configMode === 'max' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Permission Descriptions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-800">
              <div><strong>Force Transfer:</strong> Ability to transfer tokens without holder consent</div>
              <div><strong>Mint:</strong> Create new tokens</div>
              <div><strong>Burn:</strong> Destroy existing tokens</div>
              <div><strong>Pause:</strong> Pause all token transfers</div>
              <div><strong>Freeze Account:</strong> Freeze specific investor accounts</div>
              <div><strong>Update Documents:</strong> Modify legal documents</div>
              <div><strong>Manage Partitions:</strong> Create/modify token partitions</div>
              <div><strong>Compliance Override:</strong> Override compliance restrictions</div>
              <div><strong>Redemption:</strong> Force token redemption</div>
              <div><strong>Corporate Actions:</strong> Execute corporate actions</div>
            </div>
          </CardContent>
        </Card>
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

export default ERC1400ControllersTab;