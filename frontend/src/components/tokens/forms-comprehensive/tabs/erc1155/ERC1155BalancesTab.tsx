// ERC-1155 Balances Tab - Balance Tracking
// Comprehensive balance management for ERC-1155 tokens

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Search,
  Wallet,
  Hash,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

import { TokenERC1155BalancesData, ConfigMode } from '../../types';

interface ERC1155BalancesTabProps {
  data?: TokenERC1155BalancesData[];
  validationErrors?: Record<string, string[]>;
  isModified?: boolean;
  configMode: ConfigMode;
  onFieldChange: (field: string, value: any, recordIndex?: number) => void;
  onValidate: () => Promise<boolean>;
  isSubmitting?: boolean;
}

const ERC1155BalancesTab: React.FC<ERC1155BalancesTabProps> = ({
  data = [],
  validationErrors = {},
  isModified = false,
  configMode,
  onFieldChange,
  onValidate,
  isSubmitting = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterByType, setFilterByType] = useState('');

  const addNewBalance = () => {
    const newBalance: TokenERC1155BalancesData = {
      token_type_id: '',
      address: '',
      amount: '0'
    };
    
    onFieldChange('newRecord', newBalance, data.length);
  };

  const removeBalance = (index: number) => {
    if (confirm('Are you sure you want to remove this balance record?')) {
      onFieldChange('removeRecord', null, index);
    }
  };

  const handleFieldChange = (index: number, field: string, value: any) => {
    onFieldChange(field, value, index);
  };

  const getFieldError = (index: number, field: string) => {
    return validationErrors[`${index}.${field}`] || [];
  };

  const hasFieldError = (index: number, field: string) => {
    return getFieldError(index, field).length > 0;
  };

  // Filter data based on search and type filter
  const filteredData = data.filter(balance => {
    const matchesSearch = !searchTerm || 
      balance.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      balance.token_type_id?.includes(searchTerm);
    
    const matchesType = !filterByType || balance.token_type_id === filterByType;
    
    return matchesSearch && matchesType;
  });

  // Get unique token types for filter
  const uniqueTypes = [...new Set(data.map(b => b.token_type_id).filter(Boolean))];

  if (configMode === 'min') {
    // Basic mode - simplified balance tracking
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Token Balances ({data.length})
              </CardTitle>
              <Button onClick={addNewBalance} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Balance
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.map((balance, index) => (
                <Card key={index} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Token Type ID</Label>
                        <Input
                          value={balance.token_type_id || ''}
                          onChange={(e) => handleFieldChange(index, 'token_type_id', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      
                      <div>
                        <Label>Address</Label>
                        <Input
                          value={balance.address || ''}
                          onChange={(e) => handleFieldChange(index, 'address', e.target.value)}
                          placeholder="0x..."
                        />
                      </div>

                      <div>
                        <Label>Amount</Label>
                        <Input
                          value={balance.amount || ''}
                          onChange={(e) => handleFieldChange(index, 'amount', e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeBalance(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No balance records. Click "Add Balance" to track token holdings.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Advanced mode - full balance management
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Balance Tracking & Management ({filteredData.length} of {data.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Sync Balances
              </Button>
              <Button onClick={addNewBalance} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Balance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by address or token type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <select
                value={filterByType}
                onChange={(e) => setFilterByType(e.target.value)}
                className="w-full h-10 px-3 border border-input bg-background rounded-md"
              >
                <option value="">All Token Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>Type {type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Balance Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{data.length}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {new Set(data.map(b => b.address)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Unique Holders</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {uniqueTypes.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Token Types</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">
                      {data.reduce((sum, b) => sum + (parseInt(b.amount || '0') || 0), 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Supply</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Balance Records */}
          <div className="space-y-4">
            {filteredData.map((balance, index) => {
              const originalIndex = data.findIndex(b => b === balance);
              return (
                <Card key={originalIndex} className="relative">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor={`token_type_id_${originalIndex}`}>Token Type ID *</Label>
                        <Input
                          id={`token_type_id_${originalIndex}`}
                          value={balance.token_type_id || ''}
                          onChange={(e) => handleFieldChange(originalIndex, 'token_type_id', e.target.value)}
                          placeholder="1"
                        />
                        {hasFieldError(originalIndex, 'token_type_id') && (
                          <div className="text-sm text-red-500 mt-1">
                            {getFieldError(originalIndex, 'token_type_id').join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="md:col-span-2">
                        <Label htmlFor={`address_${originalIndex}`}>Holder Address *</Label>
                        <Input
                          id={`address_${originalIndex}`}
                          value={balance.address || ''}
                          onChange={(e) => handleFieldChange(originalIndex, 'address', e.target.value)}
                          placeholder="0x1234567890123456789012345678901234567890"
                        />
                        {hasFieldError(originalIndex, 'address') && (
                          <div className="text-sm text-red-500 mt-1">
                            {getFieldError(originalIndex, 'address').join(', ')}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`amount_${originalIndex}`}>Amount *</Label>
                        <Input
                          id={`amount_${originalIndex}`}
                          value={balance.amount || ''}
                          onChange={(e) => handleFieldChange(originalIndex, 'amount', e.target.value)}
                          placeholder="100"
                        />
                        {hasFieldError(originalIndex, 'amount') && (
                          <div className="text-sm text-red-500 mt-1">
                            {getFieldError(originalIndex, 'amount').join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          Type: <Badge variant="outline">#{balance.token_type_id}</Badge>
                        </span>
                        <span>
                          Balance: <Badge variant="outline">{balance.amount || '0'}</Badge>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Quick actions could be added here
                            console.log('View transactions for', balance.address);
                          }}
                        >
                          View History
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeBalance(originalIndex)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredData.length === 0 && data.length > 0 && (
              <Card>
                <CardContent className="text-center py-8">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Results Found</h3>
                  <p className="text-muted-foreground">
                    No balance records match your search criteria.
                  </p>
                </CardContent>
              </Card>
            )}

            {data.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Balance Records</h3>
                  <p className="text-muted-foreground mb-4">
                    Track token balances across different holders and token types.
                  </p>
                  <Button onClick={addNewBalance}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Balance Record
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
            ERC-1155 Balance Tracking
          </span>
        </div>
        <Button 
          onClick={onValidate} 
          variant="outline" 
          size="sm"
          disabled={isSubmitting}
        >
          Validate Balances
        </Button>
      </div>
    </div>
  );
};

export default ERC1155BalancesTab;