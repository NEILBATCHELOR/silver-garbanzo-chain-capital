// ERC721 Mint Phases Tab Component
// Handles token_erc721_mint_phases table for NFT minting configuration

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Trash2, Edit2, Save, X, Calendar, Users, DollarSign } from 'lucide-react';

import { TokenERC721MintPhasesData, ConfigMode } from '../../types';

interface ERC721MintPhasesTabProps {
  data: TokenERC721MintPhasesData | TokenERC721MintPhasesData[];
  validationErrors: Record<string, string[]>;
  isModified: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const ERC721MintPhasesTab: React.FC<ERC721MintPhasesTabProps> = ({
  data,
  validationErrors,
  isModified,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting
}) => {
  const phasesData = Array.isArray(data) ? data : [];
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newPhase, setNewPhase] = useState<Partial<TokenERC721MintPhasesData>>({});

  const handleAddPhase = () => {
    const newIndex = phasesData.length;
    const phaseToAdd = {
      phase_name: newPhase.phase_name || '',
      start_time: newPhase.start_time || '',
      end_time: newPhase.end_time || '',
      max_mint_per_address: newPhase.max_mint_per_address || 1,
      price: newPhase.price || '0',
      merkle_root: newPhase.merkle_root || '',
      is_active: newPhase.is_active !== undefined ? newPhase.is_active : true
    };

    onFieldChange('new_record', phaseToAdd, newIndex);
    setNewPhase({});
  };

  const handleUpdatePhase = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const handleDeletePhase = (index: number) => {
    onFieldChange('_deleted', true, index);
  };

  const getFieldError = (index: number, field: string): string[] => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string): boolean => {
    return getFieldError(index, field).length > 0;
  };

  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    try {
      return new Date(dateTimeString).toLocaleString();
    } catch {
      return dateTimeString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Mint Phases
            </div>
            <Badge variant="outline">{phasesData.length} phases</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure different minting phases for your NFT collection. Each phase can have
            different pricing, limits, and access controls (whitelists, public, etc.).
          </p>
        </CardContent>
      </Card>

      {/* Add New Phase */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Mint Phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="new_phase_name" className="text-sm font-medium">
                Phase Name *
              </Label>
              <Input
                id="new_phase_name"
                value={newPhase.phase_name || ''}
                onChange={(e) => setNewPhase(prev => ({ ...prev, phase_name: e.target.value }))}
                placeholder="e.g., Whitelist, Public, VIP"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_price" className="text-sm font-medium">
                Price (ETH)
              </Label>
              <Input
                id="new_price"
                type="number"
                step="0.001"
                min="0"
                value={newPhase.price || '0'}
                onChange={(e) => setNewPhase(prev => ({ ...prev, price: e.target.value }))}
                placeholder="0.05"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_start_time" className="text-sm font-medium">
                Start Time
              </Label>
              <Input
                id="new_start_time"
                type="datetime-local"
                value={newPhase.start_time || ''}
                onChange={(e) => setNewPhase(prev => ({ ...prev, start_time: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_end_time" className="text-sm font-medium">
                End Time
              </Label>
              <Input
                id="new_end_time"
                type="datetime-local"
                value={newPhase.end_time || ''}
                onChange={(e) => setNewPhase(prev => ({ ...prev, end_time: e.target.value }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_max_mint" className="text-sm font-medium">
                Max Mint per Address
              </Label>
              <Input
                id="new_max_mint"
                type="number"
                min="1"
                value={newPhase.max_mint_per_address || 1}
                onChange={(e) => setNewPhase(prev => ({ ...prev, max_mint_per_address: parseInt(e.target.value) }))}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_merkle_root" className="text-sm font-medium">
                Merkle Root (for whitelist)
              </Label>
              <Input
                id="new_merkle_root"
                value={newPhase.merkle_root || ''}
                onChange={(e) => setNewPhase(prev => ({ ...prev, merkle_root: e.target.value }))}
                placeholder="0x... (optional)"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="new_is_active"
                checked={newPhase.is_active !== undefined ? newPhase.is_active : true}
                onCheckedChange={(checked) => setNewPhase(prev => ({ ...prev, is_active: checked }))}
                disabled={isSubmitting}
              />
              <Label htmlFor="new_is_active" className="text-sm">Active Phase</Label>
            </div>

            <Button
              onClick={handleAddPhase}
              disabled={!newPhase.phase_name || isSubmitting}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Phase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Phases List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Phases</CardTitle>
        </CardHeader>
        <CardContent>
          {phasesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No mint phases configured yet. Add your first phase above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phase</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Max/Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Whitelist</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phasesData.map((phase, index) => (
                  <TableRow key={index} className={phase._deleted ? 'opacity-50 line-through' : ''}>
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={phase.phase_name || ''}
                          onChange={(e) => handleUpdatePhase(index, 'phase_name', e.target.value)}
                          className={hasFieldError(index, 'phase_name') ? 'border-red-500' : ''}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <div className="space-y-1">
                          <span className="font-medium">{phase.phase_name}</span>
                          {hasFieldError(index, 'phase_name') && (
                            <div className="text-xs text-red-500">
                              {getFieldError(index, 'phase_name').join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={phase.price || '0'}
                          onChange={(e) => handleUpdatePhase(index, 'price', e.target.value)}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span>{phase.price || '0'} ETH</span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <Input
                            type="datetime-local"
                            value={phase.start_time || ''}
                            onChange={(e) => handleUpdatePhase(index, 'start_time', e.target.value)}
                            disabled={isSubmitting}
                          />
                          <Input
                            type="datetime-local"
                            value={phase.end_time || ''}
                            onChange={(e) => handleUpdatePhase(index, 'end_time', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      ) : (
                        <div className="text-xs space-y-1">
                          <div>Start: {formatDateTime(phase.start_time)}</div>
                          <div>End: {formatDateTime(phase.end_time)}</div>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          min="1"
                          value={phase.max_mint_per_address || 1}
                          onChange={(e) => handleUpdatePhase(index, 'max_mint_per_address', parseInt(e.target.value))}
                          disabled={isSubmitting}
                          className="w-20"
                        />
                      ) : (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{phase.max_mint_per_address || 1}</span>
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Switch
                          checked={phase.is_active || false}
                          onCheckedChange={(checked) => handleUpdatePhase(index, 'is_active', checked)}
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Badge variant={phase.is_active ? "default" : "secondary"}>
                          {phase.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {editingIndex === index ? (
                        <Input
                          value={phase.merkle_root || ''}
                          onChange={(e) => handleUpdatePhase(index, 'merkle_root', e.target.value)}
                          placeholder="0x..."
                          disabled={isSubmitting}
                        />
                      ) : (
                        <Badge variant={phase.merkle_root ? "outline" : "secondary"}>
                          {phase.merkle_root ? 'Whitelist' : 'Public'}
                        </Badge>
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
                              disabled={isSubmitting || phase._deleted}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePhase(index)}
                              disabled={isSubmitting || phase._deleted}
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
      {configMode === 'max' && phasesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Advanced Phase Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phase Ordering</Label>
                <p className="text-xs text-muted-foreground">
                  Phases will be executed in the order they appear. Earlier phases should typically
                  have earlier start times.
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Make sure phase times don't overlap unless intentional for parallel phases.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Whitelist Management</Label>
                <p className="text-xs text-muted-foreground">
                  Use Merkle roots for gas-efficient whitelist verification. Generate the Merkle tree
                  from your whitelist addresses and store the root hash.
                </p>
                <div className="text-sm bg-muted p-3 rounded-lg">
                  <strong>Tools:</strong> Use libraries like merkletreejs to generate Merkle trees
                  from your whitelist addresses.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mint Phases:</span>
          {isModified ? (
            <Badge variant="outline" className="text-yellow-600">Modified</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600">Saved</Badge>
          )}
          <Badge variant="outline">
            {phasesData.filter(phase => phase.is_active && !phase._deleted).length} active
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

export default ERC721MintPhasesTab;
