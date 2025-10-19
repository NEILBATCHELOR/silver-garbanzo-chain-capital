/**
 * Address Grouped By Role Component
 * Displays blockchain addresses organized by their contract permissions
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  Search,
  Key,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { ContractRoleType } from '@/services/user/contractRoles';
import type { RoleAddress } from '@/services/wallet/multiSig/RoleAddressService';
import { cn } from '@/utils/utils';
import { AddressCardEnhanced } from './AddressCardEnhanced';

interface AddressGroupedByRoleProps {
  addresses: RoleAddress[];
  inheritedRoles: ContractRoleType[]; // Roles from role_contracts table
  onDelete?: (address: RoleAddress) => void;
  onEditRoles?: (address: RoleAddress, roles: ContractRoleType[]) => void;
  onViewContracts?: (address: RoleAddress) => void;
  className?: string;
}

export function AddressGroupedByRole({
  addresses,
  inheritedRoles,
  onDelete,
  onEditRoles,
  onViewContracts,
  className
}: AddressGroupedByRoleProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlockchain, setFilterBlockchain] = useState<string>('all');

  // Group addresses by their effective permissions
  const groupedAddresses = useMemo(() => {
    const groups: Record<string, RoleAddress[]> = {};

    addresses.forEach(address => {
      // Determine effective roles
      const effectiveRoles = address.contractRoles && address.contractRoles.length > 0
        ? address.contractRoles
        : inheritedRoles;

      effectiveRoles.forEach(role => {
        if (!groups[role]) {
          groups[role] = [];
        }
        groups[role].push(address);
      });
    });

    return groups;
  }, [addresses, inheritedRoles]);

  // Get unique blockchains
  const blockchains = useMemo(() => {
    const chains = new Set(addresses.map(a => a.blockchain));
    return Array.from(chains);
  }, [addresses]);

  // Filter addresses
  const filteredAddresses = useMemo(() => {
    return addresses.filter(address => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        address.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.blockchain.toLowerCase().includes(searchTerm.toLowerCase());

      // Blockchain filter
      const matchesBlockchain = filterBlockchain === 'all' || 
        address.blockchain === filterBlockchain;

      return matchesSearch && matchesBlockchain;
    });
  }, [addresses, searchTerm, filterBlockchain]);

  // Regroup filtered addresses
  const filteredGroups = useMemo(() => {
    const groups: Record<string, RoleAddress[]> = {};

    filteredAddresses.forEach(address => {
      const effectiveRoles = address.contractRoles && address.contractRoles.length > 0
        ? address.contractRoles
        : inheritedRoles;

      effectiveRoles.forEach(role => {
        if (!groups[role]) {
          groups[role] = [];
        }
        groups[role].push(address);
      });
    });

    return groups;
  }, [filteredAddresses, inheritedRoles]);

  // Get all unique roles (sorted alphabetically)
  const allRoles = useMemo(() => {
    return Object.keys(filteredGroups).sort();
  }, [filteredGroups]);

  // Count statistics
  const stats = useMemo(() => {
    const inheritingCount = addresses.filter(
      a => !a.contractRoles || a.contractRoles.length === 0
    ).length;
    const explicitCount = addresses.length - inheritingCount;

    return {
      total: addresses.length,
      inheriting: inheritingCount,
      explicit: explicitCount,
      roles: Object.keys(groupedAddresses).length
    };
  }, [addresses, groupedAddresses]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Addresses</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Inheriting All</p>
                <p className="text-2xl font-bold">{stats.inheriting}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Explicit</p>
                <p className="text-2xl font-bold">{stats.explicit}</p>
              </div>
              <Shield className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Unique Roles</p>
                <p className="text-2xl font-bold">{stats.roles}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Search */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Search className="h-3 w-3" />
            Search Addresses
          </Label>
          <Input
            placeholder="Search by address or blockchain..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Blockchain Filter */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1">
            <Filter className="h-3 w-3" />
            Filter by Blockchain
          </Label>
          <select
            value={filterBlockchain}
            onChange={(e) => setFilterBlockchain(e.target.value)}
            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="all">All Blockchains ({addresses.length})</option>
            {blockchains.map(chain => (
              <option key={chain} value={chain}>
                {chain.charAt(0).toUpperCase() + chain.slice(1)} ({
                  addresses.filter(a => a.blockchain === chain).length
                })
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grouped View */}
      {allRoles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No addresses match your search criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={allRoles} className="space-y-2">
          {allRoles.map(role => {
            const roleAddresses = filteredGroups[role];
            const inheritingCount = roleAddresses.filter(
              a => !a.contractRoles || a.contractRoles.length === 0
            ).length;
            const explicitCount = roleAddresses.length - inheritingCount;

            return (
              <AccordionItem 
                key={role} 
                value={role}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between flex-1 pr-4">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <div className="text-left">
                        <p className="font-semibold">{role}</p>
                        <p className="text-xs text-muted-foreground">
                          {roleAddresses.length} address{roleAddresses.length !== 1 ? 'es' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {inheritingCount > 0 && (
                        <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          {inheritingCount} Inheriting
                        </Badge>
                      )}
                      {explicitCount > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {explicitCount} Explicit
                        </Badge>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 pt-3">
                  {roleAddresses.map(address => (
                    <AddressCardEnhanced
                      key={address.id}
                      address={address}
                      inheritedRoles={inheritedRoles}
                      onDelete={onDelete}
                      onEditRoles={onEditRoles}
                      onViewContracts={onViewContracts}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Results Summary */}
      <div className="text-xs text-muted-foreground text-center">
        Showing {filteredAddresses.length} of {addresses.length} addresses
        {searchTerm && ` matching "${searchTerm}"`}
        {filterBlockchain !== 'all' && ` on ${filterBlockchain}`}
      </div>
    </div>
  );
}
