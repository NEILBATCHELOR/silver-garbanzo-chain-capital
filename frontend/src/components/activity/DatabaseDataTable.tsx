/**
 * Database Data Table
 * Advanced data table for viewing and filtering CRUD operations across all database tables
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  Download,
  Eye,
  AlertTriangle,
  Clock,
  User,
  Settings,
  RefreshCw,
  Database,
  Plus,
  Pencil,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

import { backendAuditService, AuditEvent, AuditQueryOptions } from '@/services/audit/BackendAuditService';

interface DatabaseDataTableProps {
  projectId?: string;
  dateRange?: DateRange;
  refreshInterval?: number;
  className?: string;
}

// Define CRUD operation types
const CRUD_OPERATIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;
type CrudOperation = typeof CRUD_OPERATIONS[number];

// All database tables grouped by domain (Updated to include all 261 tables)
const DATABASE_TABLES = {
  'Core Business': [
    'projects', 'investors', 'organizations', 'users', 'roles', 'permissions',
    'subscriptions', 'documents', 'notifications', 'user_roles', 'role_permissions',
    'user_sessions', 'auth_events', 'user_mfa_settings', 'alerts'
  ],
  'Token Management': [
    'tokens', 'token_templates', 'token_deployments', 'token_allocations',
    'token_erc20_properties', 'token_erc20_view', 'token_erc721_properties', 
    'token_erc721_view', 'token_erc721_attributes', 'token_erc721_mint_phases',
    'token_erc721_trait_definitions', 'token_erc1155_properties', 'token_erc1155_view',
    'token_erc1155_balances', 'token_erc1155_crafting_recipes', 'token_erc1155_discount_tiers',
    'token_erc1155_type_configs', 'token_erc1155_types', 'token_erc1155_uri_mappings',
    'token_erc1400_properties', 'token_erc1400_view', 'token_erc1400_controllers',
    'token_erc1400_corporate_actions', 'token_erc1400_custody_providers',
    'token_erc1400_documents', 'token_erc1400_partition_balances',
    'token_erc1400_partition_operators', 'token_erc1400_partition_transfers',
    'token_erc1400_partitions', 'token_erc1400_regulatory_filings',
    'token_erc3525_properties', 'token_erc3525_view', 'token_erc3525_allocations',
    'token_erc3525_payment_schedules', 'token_erc3525_slot_configs',
    'token_erc3525_slots', 'token_erc3525_value_adjustments',
    'token_erc4626_properties', 'token_erc4626_view', 'token_erc4626_asset_allocations',
    'token_erc4626_fee_tiers', 'token_erc4626_performance_metrics',
    'token_erc4626_strategy_params', 'token_erc4626_vault_strategies',
    'token_events', 'token_deployment_history', 'token_designs', 'token_versions',
    'token_operations', 'token_geographic_restrictions', 'token_geographic_restrictions_view',
    'token_sanctions_rules', 'token_whitelist_summary', 'token_whitelists'
  ],
  'Cap Table': [
    'cap_tables', 'cap_table_investors', 'distributions', 'distribution_redemptions',
    'transfer_history'
  ],
  'Redemption': [
    'redemption_requests', 'redemption_settlements', 'redemption_windows',
    'redemption_approval_status', 'redemption_approvers', 'redemption_rules',
    'redemption_window_configs', 'redemption_approver_assignments',
    'active_redemption_windows'
  ],
  'Wallet & Transactions': [
    'wallets', 'wallet_details', 'wallet_transactions', 'transactions',
    'smart_contract_wallets', 'multi_sig_wallets', 'guardian_wallets',
    'wallet_facets', 'wallet_guardians', 'wallet_locks', 'wallet_restriction_rules',
    'wallet_signatories', 'wallet_transaction_drafts', 'multi_sig_confirmations',
    'multi_sig_transactions', 'transaction_events', 'transaction_notifications',
    'transaction_proposals', 'transaction_signatures', 'guardian_operations',
    'guardian_api_tests', 'facet_registry', 'signature_migrations',
    'signature_migration_approvals', 'signatures'
  ],
  'Compliance & Security': [
    'compliance_checks', 'compliance_reports', 'security_events',
    'kyc_screening_logs', 'audit_logs', 'security_audit_logs',
    'compliance_settings', 'onboarding_restrictions', 'onchain_claims',
    'onchain_identities', 'onchain_issuers', 'onchain_verification_history',
    'risk_assessments', 'regulatory_equivalence_mapping', 'restriction_statistics',
    'restriction_validation_logs', 'audit_coverage', 'credential_usage_logs',
    'webauthn_challenges', 'webauthn_credentials', 'mfa_policies'
  ],
  'Financial Services': [
    'moonpay_transactions', 'moonpay_customers', 'moonpay_passes', 'moonpay_policies',
    'moonpay_policy_logs', 'moonpay_projects', 'moonpay_swap_transactions',
    'moonpay_webhook_config', 'moonpay_webhook_events', 'moonpay_asset_cache',
    'moonpay_compliance_alerts', 'stripe_conversion_transactions',
    'stripe_stablecoin_accounts', 'stripe_webhook_events', 'fiat_transactions',
    'fiat_quotes', 'faucet_requests', 'invoices', 'invoice', 'ripple_payments',
    'ramp_network_config', 'ramp_supported_assets', 'ramp_transaction_events',
    'ramp_webhook_events'
  ],
  'DFNS Integration': [
    'dfns_activity_logs', 'dfns_api_requests', 'dfns_applications',
    'dfns_authentication_challenges', 'dfns_broadcast_transactions',
    'dfns_credential_challenges', 'dfns_credentials', 'dfns_exchange_accounts',
    'dfns_exchange_balances', 'dfns_exchange_integrations', 'dfns_fee_sponsors',
    'dfns_fiat_activity_logs', 'dfns_fiat_provider_configs', 'dfns_fiat_quotes',
    'dfns_fiat_transactions', 'dfns_permission_assignments', 'dfns_permissions',
    'dfns_personal_access_tokens', 'dfns_policies', 'dfns_policy_approvals',
    'dfns_service_accounts', 'dfns_signatures', 'dfns_signing_keys',
    'dfns_sponsored_fees', 'dfns_staking_integrations', 'dfns_sync_status',
    'dfns_transaction_history', 'dfns_transfers', 'dfns_user_action_challenges',
    'dfns_user_sessions', 'dfns_users', 'dfns_validators', 'dfns_wallet_balances',
    'dfns_wallet_nfts', 'dfns_wallets', 'dfns_webhook_deliveries', 'dfns_webhooks'
  ],
  'Business Operations': [
    'approval_configs', 'approval_config_approvers', 'approval_config_history',
    'approval_configs_with_approvers', 'approval_requests', 'bulk_operations',
    'batch_operations', 'paymaster_operations', 'user_operations', 'workflow_stages',
    'document_approvals', 'document_versions', 'document_workflows',
    'investor_approvals', 'investor_groups', 'investor_group_members',
    'investor_groups_investors', 'investors_backup_pre_kyc_update',
    'issuer_access_roles', 'issuer_detail_documents', 'issuer_documents',
    'policy_templates', 'policy_template_approvers', 'policy_rule_approvers',
    'policy_rule_approvers_backup', 'rules', 'valid_policy_approvers'
  ],
  'System & Infrastructure': [
    'system_processes', 'system_settings', 'health_checks', 'monitoring_metrics',
    'activity_analytics', 'system_process_activities', 'system_process_activity',
    'system_process_performance', 'deployment_rate_limits', 'consensus_settings',
    'geographic_jurisdictions', 'nav_oracle_configs', 'fund_nav_data',
    'latest_nav_by_fund', 'project_credentials', 'project_type_stats',
    'project_wallets', 'settlement_metrics', 'settlement_summary',
    'stage_requirements', 'whitelist_entries', 'whitelist_settings',
    'whitelist_signatories', 'user_permissions_view'
  ],
  'FMI & Trading': [
    'fmi_executions', 'fmi_market_data', 'fmi_positions', 'fmi_risk_limits',
    'fmi_trades', 'fmi_users', 'payer', 'pool', 'provider'
  ]
} as const;

// Flatten all tables for the filter
const ALL_TABLES = Object.values(DATABASE_TABLES).flat();

export function DatabaseDataTable({ 
  projectId, 
  dateRange,
  refreshInterval = 30000,
  className = '' 
}: DatabaseDataTableProps) {
  const [data, setData] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [sorting, setSorting] = useState<SortingState>([{ id: 'timestamp', desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  // Database-specific filters
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [operationFilter, setOperationFilter] = useState<string>('all');
  const [tableGroupFilter, setTableGroupFilter] = useState<string>('all');

  const getCrudOperationIcon = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('insert') || actionLower.includes('add')) {
      return <Plus className="h-3 w-3" />;
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) {
      return <Pencil className="h-3 w-3" />;
    }
    if (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('destroy')) {
      return <Trash2 className="h-3 w-3" />;
    }
    return <Eye className="h-3 w-3" />;
  };

  const getCrudOperationVariant = (action: string) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create') || actionLower.includes('insert') || actionLower.includes('add')) {
      return 'success';
    }
    if (actionLower.includes('update') || actionLower.includes('edit') || actionLower.includes('modify')) {
      return 'secondary';
    }
    if (actionLower.includes('delete') || actionLower.includes('remove') || actionLower.includes('destroy')) {
      return 'destructive';
    }
    return 'outline';
  };

  const getTableGroup = (tableName: string) => {
    for (const [group, tables] of Object.entries(DATABASE_TABLES)) {
      if ((tables as readonly string[]).includes(tableName)) {
        return group;
      }
    }
    return 'Other';
  };

  const columns: ColumnDef<AuditEvent>[] = useMemo(() => [
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          <Clock className="h-4 w-4 mr-2" />
          Time
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const timestamp = row.getValue('timestamp') as string;
        return (
          <div className="text-sm">
            <div>{format(new Date(timestamp), 'MMM dd, yyyy')}</div>
            <div className="text-muted-foreground">{format(new Date(timestamp), 'HH:mm:ss')}</div>
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: 'action',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Operation
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const action = row.getValue('action') as string;
        return (
          <div className="flex items-center space-x-2">
            <Badge variant={getCrudOperationVariant(action)} className="text-xs">
              {getCrudOperationIcon(action)}
              <span className="ml-1">{action}</span>
            </Badge>
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'entity_type',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          <Database className="h-4 w-4 mr-2" />
          Table
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const entityType = row.getValue('entity_type') as string;
        const tableGroup = getTableGroup(entityType);
        
        return (
          <div className="text-sm">
            <div className="font-medium">{entityType}</div>
            <Badge variant="outline" className="text-xs mt-1">
              {tableGroup}
            </Badge>
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'entity_id',
      header: 'Record ID',
      cell: ({ row }) => {
        const entityId = row.original.entity_id;
        const entityType = row.original.entity_type;
        
        if (!entityId) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div className="text-sm">
            <div className="font-mono text-xs">
              {entityId.length > 20 ? `${entityId.substring(0, 20)}...` : entityId}
            </div>
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'username',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          <User className="h-4 w-4 mr-2" />
          User
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const username = row.getValue('username') as string;
        const userEmail = row.original.user_email;
        const isAutomated = row.original.is_automated;
        
        if (isAutomated) {
          return (
            <Badge variant="secondary" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              System
            </Badge>
          );
        }
        
        return (
          <div className="text-sm">
            <div className="font-medium">{username || 'Unknown'}</div>
            {userEmail && (
              <div className="text-muted-foreground text-xs">{userEmail}</div>
            )}
          </div>
        );
      },
      size: 130,
    },
    {
      accessorKey: 'details',
      header: 'Changes',
      cell: ({ row }) => {
        const details = row.getValue('details') as string;
        const metadata = row.original.metadata;
        
        return (
          <div className="text-sm max-w-xs">
            <div className="truncate">{details || 'No details'}</div>
            {metadata?.source && (
              <Badge variant="outline" className="text-xs mt-1">
                {metadata.source}
              </Badge>
            )}
          </div>
        );
      },
      size: 200,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;
        const severity = row.original.severity;
        
        return (
          <div className="flex flex-col space-y-1">
            <Badge variant={status?.toLowerCase() === 'success' ? 'success' : 'destructive'} className="text-xs w-fit">
              {status || 'Unknown'}
            </Badge>
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: 'duration',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 font-semibold"
        >
          Duration
          {column.getIsSorted() === 'asc' ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : column.getIsSorted() === 'desc' ? (
            <ChevronDown className="ml-2 h-4 w-4" />
          ) : null}
        </Button>
      ),
      cell: ({ row }) => {
        const duration = row.getValue('duration') as number;
        if (!duration) return <span className="text-muted-foreground">-</span>;
        
        return (
          <span className={`text-sm ${duration > 5000 ? 'text-red-500 font-medium' : ''}`}>
            {duration}ms
          </span>
        );
      },
      size: 80,
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: ({ row }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // TODO: Open database operation details modal
              console.log('View database operation:', row.original);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        );
      },
      size: 50,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / pagination.pageSize),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      pagination,
    },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: AuditQueryOptions['filters'] = {};
      
      if (projectId) filters.project_id = projectId;
      if (tableFilter !== 'all') filters.entity_type = tableFilter;
      // Note: Backend filter interface doesn't support action_pattern or entity_types
      // These filters will be applied on the frontend after data retrieval
      
      // Remove unsupported filter properties - will be handled in frontend filtering below
      if (dateRange?.from) filters.date_from = dateRange.from.toISOString();
      if (dateRange?.to) filters.date_to = dateRange.to.toISOString();

      const options: AuditQueryOptions = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sort: sorting[0]?.id || 'timestamp',
        order: sorting[0]?.desc ? 'desc' : 'asc',
        filters,
      };

      const result = await backendAuditService.getAuditEvents(options);

      if (result.success) {
        // Start with all database operations
        let databaseOperations = (result.data.data || []).filter(event => 
          event.entity_type && 
          (ALL_TABLES as string[]).includes(event.entity_type) &&
          (event.category === 'system' || event.action?.match(/create|read|update|delete|insert|modify|remove/i))
        );

        // Apply frontend filters since backend doesn't support these filter types
        if (operationFilter !== 'all') {
          const operationPatterns: Record<string, string[]> = {
            'CREATE': ['create', 'insert', 'add'],
            'READ': ['read', 'view', 'get', 'fetch'],
            'UPDATE': ['update', 'edit', 'modify', 'change'],
            'DELETE': ['delete', 'remove', 'destroy'],
          };
          const patterns = operationPatterns[operationFilter] || [];
          databaseOperations = databaseOperations.filter(event => 
            event.action && patterns.some(pattern => 
              event.action.toLowerCase().includes(pattern)
            )
          );
        }

        if (tableGroupFilter !== 'all') {
          const tablesInGroup = DATABASE_TABLES[tableGroupFilter as keyof typeof DATABASE_TABLES] || [];
          databaseOperations = databaseOperations.filter(event => 
            event.entity_type && (tablesInGroup as readonly string[]).includes(event.entity_type)
          );
        }

        setData(databaseOperations);
        setTotal(databaseOperations.length);
      } else {
        throw new Error('Failed to load database operations');
      }
    } catch (err) {
      console.error('Error loading database operations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load database operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    sorting,
    tableFilter,
    operationFilter,
    tableGroupFilter,
    dateRange,
    projectId,
  ]);

  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const resetFilters = () => {
    setGlobalFilter('');
    setTableFilter('all');
    setOperationFilter('all');
    setTableGroupFilter('all');
    setColumnFilters([]);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={loadData}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`database-data-table ${className}`}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Operations
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              CRUD operations across all {ALL_TABLES.length} database tables - {(total || 0).toLocaleString()} operations found
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search database operations..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={tableGroupFilter} onValueChange={setTableGroupFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Table Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {Object.keys(DATABASE_TABLES).map(group => (
                <SelectItem key={group} value={group}>{group}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Specific Table" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tables</SelectItem>
              {ALL_TABLES.sort().map(table => (
                <SelectItem key={table} value={table}>{table}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={operationFilter} onValueChange={setOperationFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Operation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Operations</SelectItem>
              {CRUD_OPERATIONS.map(op => (
                <SelectItem key={op} value={op}>{op}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Columns
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={resetFilters}>
            <Filter className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} style={{ width: header.column.columnDef.size }}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell colSpan={columns.length} className="h-24">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin" />
                        <span className="ml-2">Loading database operations...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No database operations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between space-x-2 p-4">
          <div className="flex-1 text-sm text-muted-foreground">
            Showing {pagination.pageIndex * pagination.pageSize + 1} to{' '}
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, total || 0)} of{' '}
            {(total || 0).toLocaleString()} database operations
          </div>
          <div className="flex items-center space-x-2">
            <Select 
              value={pagination.pageSize.toString()}
              onValueChange={(value) => 
                setPagination(prev => ({ ...prev, pageSize: parseInt(value), pageIndex: 0 }))
              }
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex w-[100px] items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </div>
            
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default DatabaseDataTable;