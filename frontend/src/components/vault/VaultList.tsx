/**
 * VaultList Component
 * 
 * Comprehensive list view of all vaults with filtering and sorting
 * Provides detailed information and management capabilities
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2,
  Search,
  Filter,
  ArrowUpDown,
  ExternalLink,
  PlusCircle,
  MinusCircle,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { cn } from '@/utils/utils';

interface VaultInfo {
  id: string;
  contract_address: string;
  contract_name: string;
  blockchain: string;
  network: string;
  project_id: string;
  product_id: string;
  product_type: string;
  is_active: boolean;
  created_at: string;
  // Calculated fields
  total_deposited?: string;
  total_value?: string;
  position_count?: number;
  apy?: number;
}

interface VaultListProps {
  projectId?: string;
}

type SortField = 'name' | 'tvl' | 'apy' | 'positions' | 'created';
type SortDirection = 'asc' | 'desc';

export const VaultList: React.FC<VaultListProps> = ({ projectId }) => {
  const navigate = useNavigate();
  
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [filteredVaults, setFilteredVaults] = useState<VaultInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadVaults();
  }, [projectId]);

  useEffect(() => {
    filterAndSortVaults();
  }, [vaults, searchTerm, statusFilter, sortField, sortDirection]);

  const loadVaults = async () => {
    try {
      setLoading(true);

      // Load vaults with optional project filtering
      let vaultsQuery = supabase
        .from('exchange_contracts')
        .select('*')
        .eq('contract_type', 'vault')
        .eq('blockchain', 'injective');

      if (projectId) {
        vaultsQuery = vaultsQuery.eq('project_id', projectId);
      }

      const { data: vaultData, error: vaultError } = await vaultsQuery;

      if (vaultError) throw vaultError;

      // Load position data for each vault
      const vaultsWithStats = await Promise.all(
        (vaultData || []).map(async (vault) => {
          const { data: positions } = await supabase
            .from('vault_positions')
            .select('shares, underlying_value, total_deposited')
            .eq('vault_contract', vault.contract_address)
            .eq('is_active', true);

          const totalDeposited = positions?.reduce(
            (sum, p) => sum + parseFloat(p.total_deposited || '0'), 
            0
          ) || 0;

          const totalValue = positions?.reduce(
            (sum, p) => sum + parseFloat(p.underlying_value || '0'), 
            0
          ) || 0;

          // Simple APY calculation (could be enhanced)
          const apy = totalDeposited > 0 
            ? ((totalValue - totalDeposited) / totalDeposited) * 100 
            : 0;

          return {
            ...vault,
            total_deposited: totalDeposited.toFixed(2),
            total_value: totalValue.toFixed(2),
            position_count: positions?.length || 0,
            apy: parseFloat(apy.toFixed(2))
          };
        })
      );

      setVaults(vaultsWithStats);
    } catch (error) {
      console.error('Error loading vaults:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortVaults = () => {
    let filtered = [...vaults];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(v => 
        v.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contract_address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(v => 
        statusFilter === 'active' ? v.is_active : !v.is_active
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.contract_name;
          bVal = b.contract_name;
          break;
        case 'tvl':
          aVal = parseFloat(a.total_value || '0');
          bVal = parseFloat(b.total_value || '0');
          break;
        case 'apy':
          aVal = a.apy || 0;
          bVal = b.apy || 0;
          break;
        case 'positions':
          aVal = a.position_count || 0;
          bVal = b.position_count || 0;
          break;
        case 'created':
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredVaults(filtered);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleDeposit = (vault: VaultInfo) => {
    navigate(`/projects/${projectId}/vault/deposit?vault=${vault.contract_address}`);
  };

  const handleWithdraw = (vault: VaultInfo) => {
    navigate(`/projects/${projectId}/vault/withdraw?vault=${vault.contract_address}`);
  };

  const handleManage = (vault: VaultInfo) => {
    navigate(`/projects/${projectId}/vault/manage/${vault.id}`);
  };

  const formatCurrency = (value: string) => {
    return parseFloat(value).toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">All Vaults</h2>
          <p className="text-muted-foreground">
            Comprehensive list of all vaults {projectId && 'in this project'}
          </p>
        </div>
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Deploy Vault
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vaults</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredVaults.length} of {vaults.length} vaults
        </p>
      </div>

      {/* Vaults Table */}
      <Card>
        <CardContent className="p-0">
          {filteredVaults.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all'
                  ? 'No vaults match your filters'
                  : projectId 
                    ? 'No vaults found for this project'
                    : 'No vaults available'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('name')}
                      className="h-8 px-2 font-medium"
                    >
                      Vault Name
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('tvl')}
                      className="h-8 px-2 font-medium"
                    >
                      TVL
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('apy')}
                      className="h-8 px-2 font-medium"
                    >
                      APY
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSort('positions')}
                      className="h-8 px-2 font-medium"
                    >
                      Positions
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVaults.map((vault) => (
                  <TableRow key={vault.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{vault.contract_name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {vault.contract_address.slice(0, 10)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(vault.total_value || '0')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vault.apy! > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={cn(
                          'font-medium',
                          vault.apy! > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {vault.apy?.toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {vault.position_count || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={vault.is_active ? 'default' : 'outline'}>
                        {vault.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeposit(vault)}
                          title="Deposit"
                        >
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdraw(vault)}
                          title="Withdraw"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManage(vault)}
                          title="Manage"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="View on Explorer"
                        >
                          <a 
                            href={`https://explorer.injective.network/contract/${vault.contract_address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VaultList;
