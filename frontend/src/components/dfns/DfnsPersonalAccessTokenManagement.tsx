/**
 * DFNS Personal Access Token Management Component
 * 
 * Main component for managing DFNS Personal Access Tokens
 * with full CRUD operations and lifecycle management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  DfnsPersonalAccessTokenManager
} from '@/infrastructure/dfns';
import { 
  Key, 
  Plus, 
  Settings,
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
  Power,
  PowerOff
} from 'lucide-react';
import type {
  PersonalAccessTokenResponse,
  PatTableRow
} from '@/types/dfns/personal-access-token';
import { PatActionType } from '@/types/dfns/personal-access-token';

// Child components that we'll create
import DfnsPersonalAccessTokenList from './DfnsPersonalAccessTokenList';
import DfnsPersonalAccessTokenForm from './DfnsPersonalAccessTokenForm';
import DfnsPersonalAccessTokenCard from './DfnsPersonalAccessTokenCard';

export interface DfnsPersonalAccessTokenManagementProps {
  onTokenAction?: (action: PatActionType, tokenId?: string) => void;
  defaultTab?: 'list' | 'create';
  className?: string;
}

export interface PatManagementState {
  tokens: PersonalAccessTokenResponse[];
  loading: boolean;
  error: string | null;
  selectedToken: PersonalAccessTokenResponse | null;
  showCreateForm: boolean;
  showEditForm: boolean;
  refreshKey: number;
}

/**
 * Personal Access Token Management Dashboard
 */
export default function DfnsPersonalAccessTokenManagement({
  onTokenAction,
  defaultTab = 'list',
  className
}: DfnsPersonalAccessTokenManagementProps) {
  // ===== State Management =====
  const [state, setState] = useState<PatManagementState>({
    tokens: [],
    loading: true,
    error: null,
    selectedToken: null,
    showCreateForm: false,
    showEditForm: false,
    refreshKey: 0
  });

  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [patManager] = useState(() => new DfnsPersonalAccessTokenManager());

  // ===== Data Loading =====
  const loadTokens = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const tokens = await patManager.listPersonalAccessTokens();
      setState(prev => ({ 
        ...prev, 
        tokens, 
        loading: false,
        refreshKey: prev.refreshKey + 1
      }));
    } catch (error) {
      console.error('Error loading PATs:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load tokens'
      }));
    }
  }, [patManager]);

  // Load tokens on component mount
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  // ===== Token Actions =====
  const handleTokenAction = async (action: PatActionType, tokenId?: string) => {
    if (!tokenId && action !== PatActionType.Create) {
      console.error('Token ID required for action:', action);
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      switch (action) {
        case PatActionType.Activate:
          if (tokenId) {
            await patManager.activatePersonalAccessToken(tokenId);
          }
          break;
        case PatActionType.Deactivate:
          if (tokenId) {
            await patManager.deactivatePersonalAccessToken(tokenId);
          }
          break;
        case PatActionType.Archive:
          if (tokenId) {
            const confirmed = window.confirm(
              'Are you sure you want to archive this token? This action cannot be undone.'
            );
            if (confirmed) {
              await patManager.archivePersonalAccessToken(tokenId);
            } else {
              setState(prev => ({ ...prev, loading: false }));
              return;
            }
          }
          break;
        case PatActionType.View:
          if (tokenId) {
            const token = await patManager.getPersonalAccessToken(tokenId);
            setState(prev => ({ ...prev, selectedToken: token, loading: false }));
            return;
          }
          break;
        case PatActionType.Update:
          if (tokenId) {
            const token = state.tokens.find(t => t.tokenId === tokenId);
            if (token) {
              setState(prev => ({ 
                ...prev, 
                selectedToken: token, 
                showEditForm: true, 
                loading: false 
              }));
              return;
            }
          }
          break;
        case PatActionType.Create:
          setState(prev => ({ 
            ...prev, 
            showCreateForm: true, 
            loading: false 
          }));
          return;
        default:
          console.warn('Unknown action:', action);
          setState(prev => ({ ...prev, loading: false }));
          return;
      }

      // Reload tokens after action (except view and create)
      await loadTokens();
      
      // Notify parent component
      onTokenAction?.(action, tokenId);
      
    } catch (error) {
      console.error(`Error performing action ${action}:`, error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : `Failed to ${action} token`
      }));
    }
  };

  // ===== Form Handlers =====
  const handleCreateComplete = async () => {
    setState(prev => ({ ...prev, showCreateForm: false }));
    await loadTokens();
    setActiveTab('list');
  };

  const handleEditComplete = async () => {
    setState(prev => ({ 
      ...prev, 
      showEditForm: false, 
      selectedToken: null 
    }));
    await loadTokens();
  };

  const handleFormCancel = () => {
    setState(prev => ({ 
      ...prev, 
      showCreateForm: false, 
      showEditForm: false, 
      selectedToken: null 
    }));
  };

  // ===== Statistics =====
  const getTokenStats = () => {
    const active = state.tokens.filter(t => t.isActive).length;
    const inactive = state.tokens.filter(t => !t.isActive).length;
    const total = state.tokens.length;

    return { active, inactive, total };
  };

  const stats = getTokenStats();

  // ===== Render =====
  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal Access Tokens</h1>
          <p className="text-muted-foreground">
            Manage your DFNS Personal Access Tokens for API authentication
          </p>
        </div>
        <Button 
          onClick={() => handleTokenAction(PatActionType.Create)}
          disabled={state.loading}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Token
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tokens</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Tokens</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {state.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Token List</TabsTrigger>
          <TabsTrigger value="create">Create Token</TabsTrigger>
        </TabsList>

        {/* Token List Tab */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your Personal Access Tokens</CardTitle>
                  <CardDescription>
                    Manage and monitor your API authentication tokens
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadTokens}
                  disabled={state.loading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${state.loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DfnsPersonalAccessTokenList 
                tokens={state.tokens}
                loading={state.loading}
                onTokenAction={handleTokenAction}
                refreshKey={state.refreshKey}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Token Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Personal Access Token</CardTitle>
              <CardDescription>
                Generate a new token for API authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DfnsPersonalAccessTokenForm 
                onComplete={handleCreateComplete}
                onCancel={handleFormCancel}
                loading={state.loading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Token Details Modal/Card */}
      {state.selectedToken && !state.showEditForm && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Token Details</CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setState(prev => ({ ...prev, selectedToken: null }))}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DfnsPersonalAccessTokenCard 
              token={state.selectedToken}
              onAction={handleTokenAction}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Form Modal */}
      {state.showEditForm && state.selectedToken && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Edit Token</CardTitle>
            <CardDescription>
              Update token information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DfnsPersonalAccessTokenForm 
              token={state.selectedToken}
              onComplete={handleEditComplete}
              onCancel={handleFormCancel}
              loading={state.loading}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
