import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Alert, 
  AlertDescription,
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter,
  AlertCircle,
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Activity, 
  PauseCircle, 
  PlayCircle,
  ChevronDown,
  ChevronUp,
  Loader2
} from 'lucide-react';
import { 
  Input 
} from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  TokenStatus
} from '@/types/core/centralModels';
import useTokenProjectContext from '@/hooks/project/useTokenProjectContext';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import TokenPageLayout from '../layout/TokenPageLayout';

// Import optimized components
import OptimizedTokenCard from '../display/OptimizedTokenCard';
import UnifiedTokenDetail from '../display/UnifiedTokenDetail';
import { BlocksDataDisplay, MetadataDisplay } from '../display/shared';
import { useOptimizedTokenCards } from '../hooks/use-optimized-token-cards';
import { TokenCardData, getTokenDetailData } from '../services/token-card-service';

// Import existing services for actions
import { deleteToken } from '../services/tokenDeleteService';
import { updateTokenStatus } from '../services/tokenService';

// Import modal components
import StatusTransitionDialog from '../display/shared/StatusTransitionDialog';
import TokenDeleteConfirmationDialog from '../components/TokenDeleteConfirmationDialog';
import TokenEditModal from '../components/TokenEditModal';

// Status card configuration
const statusCardConfig = {
  [TokenStatus.DRAFT]: {
    label: 'Draft',
    icon: FileText,
    color: 'bg-slate-100',
    iconColor: 'text-slate-500'
  },
  [TokenStatus.REVIEW]: {
    label: 'Under Review',
    icon: Clock,
    color: 'bg-yellow-100',
    iconColor: 'text-yellow-500'
  },
  [TokenStatus.APPROVED]: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100',
    iconColor: 'text-green-500'
  },
  [TokenStatus.REJECTED]: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100',
    iconColor: 'text-red-500'
  },
  [TokenStatus.READY_TO_MINT]: {
    label: 'Ready to Mint',
    icon: Activity,
    color: 'bg-indigo-100',
    iconColor: 'text-indigo-500'
  },
  [TokenStatus.MINTED]: {
    label: 'Minted',
    icon: CheckCircle,
    color: 'bg-blue-100',
    iconColor: 'text-blue-500'
  },
  [TokenStatus.DEPLOYED]: {
    label: 'Deployed',
    icon: CheckCircle,
    color: 'bg-purple-100',
    iconColor: 'text-purple-500'
  },
  [TokenStatus.PAUSED]: {
    label: 'Paused',
    icon: PauseCircle,
    color: 'bg-orange-100',
    iconColor: 'text-orange-500'
  },
  [TokenStatus.DISTRIBUTED]: {
    label: 'Distributed',
    icon: PlayCircle,
    color: 'bg-teal-100',
    iconColor: 'text-teal-500'
  }
};

const OptimizedTokenDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { projectId } = useParams();
  
  // Use context for project info
  const { project, isLoading: projectLoading } = useTokenProjectContext();
  
  // Use optimized token cards hook
  const { tokens, loading, error, refetch, statusCounts } = useOptimizedTokenCards(projectId);
  
  // State for filters and search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expandedStatusCards, setExpandedStatusCards] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // State for dialogs and actions
  const [selectedToken, setSelectedToken] = useState<TokenCardData | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Modal states
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStandards([]);
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setActiveTab('all');
  };

  // Filtered tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      // Tab filter
      if (activeTab === 'draft' && token.status !== TokenStatus.DRAFT) {
        return false;
      }
      if (activeTab === 'deployed' && token.status !== TokenStatus.DEPLOYED && token.status !== TokenStatus.MINTED) {
        return false;
      }
      
      // Search filter
      if (searchQuery && !token.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !token.symbol.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Standards filter
      if (selectedStandards.length > 0 && !selectedStandards.includes(token.standard)) {
        return false;
      }
      
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(token.status)) {
        return false;
      }
      
      // Category filter - check metadata.category
      if (selectedCategories.length > 0) {
        const tokenCategory = token.metadata?.category;
        if (!tokenCategory || !selectedCategories.includes(tokenCategory)) {
          return false;
        }
      }
      
      return true;
    });
  }, [tokens, searchQuery, selectedStandards, selectedStatuses, selectedCategories, activeTab]);

  // Get unique values for filter options
  const availableStatuses = useMemo(() => {
    const statuses = Array.from(new Set(tokens.map(token => token.status))).filter(Boolean);
    return statuses.sort();
  }, [tokens]);

  const availableCategories = useMemo(() => {
    const categories = Array.from(new Set(tokens.map(token => token.metadata?.category).filter(Boolean)));
    return categories.sort();
  }, [tokens]);

  // Token action handlers
  const handleViewToken = async (token: TokenCardData) => {
    setSelectedToken(token);
    setLoadingDetail(true);
    setShowDetailDialog(true);
    
    try {
      const details = await getTokenDetailData(token.id, token.standard);
      setDetailData(details);
    } catch (error) {
      console.error('Error loading token details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load token details',
        variant: 'destructive'
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditToken = (token: TokenCardData) => {
    setSelectedToken(token);
    setShowEditModal(true);
  };

  const handleDeployToken = (token: TokenCardData) => {
    // Navigate to deploy page
    navigate(`/tokens/deploy/${token.id}`);
  };

  const handleDeleteToken = (token: TokenCardData) => {
    setSelectedToken(token);
    setShowDeleteDialog(true);
  };

  const confirmDeleteToken = async () => {
    if (!selectedToken) return;

    setIsDeleting(true);
    try {
      await deleteToken(projectId, selectedToken.id);
      await refetch();
      toast({
        title: 'Token Deleted',
        description: `"${selectedToken.name}" has been deleted successfully`,
        variant: 'default'
      });
      setShowDeleteDialog(false);
      setSelectedToken(null);
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete token',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = (token: TokenCardData) => {
    setSelectedToken(token);
    setShowStatusDialog(true);
  };

  const handleStatusUpdate = (updatedToken: any) => {
    // Refresh the token list to reflect the status change
    refetch();
    setShowStatusDialog(false);
    setSelectedToken(null);
    
    toast({
      title: 'Status Updated',
      description: `Token status has been updated successfully`,
      variant: 'default'
    });
  };

  const handleTokenUpdate = (updatedToken: TokenCardData) => {
    // Refresh the token list to reflect changes
    refetch();
    setShowEditModal(false);
    setSelectedToken(null);
  };

  // Toggle status card expansion
  const toggleStatusCard = (status: string) => {
    setExpandedStatusCards(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  // Handle status card token click
  const handleStatusCardTokenClick = (token: TokenCardData) => {
    handleViewToken(token);
  };

  // Handle "View All" for status
  const handleViewAllStatus = (status: string) => {
    setSelectedStatuses([status]);
    setSearchQuery('');
    setSelectedStandards([]);
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading tokens: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <TokenPageLayout
      title="Optimized Token Dashboard"
      description="Manage tokens for this project"
      showBackButton={false}
      onRefresh={refetch}
      actionButton={
        <Button 
          variant="default" 
          size="sm"
          onClick={() => navigate(`/projects/${projectId}/tokens/create`)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Token
        </Button>
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{Object.entries(statusCardConfig).map(([status, config]) => {
          const count = statusCounts[status] || 0;
          const StatusIcon = config.icon;
          const isExpanded = expandedStatusCards[status] || false;
          const tokensWithStatus = filteredTokens.filter(token => token.status === status);
          
          return (
            <Card key={status} className="cursor-pointer hover:shadow-md transition-shadow">
              <div 
                className="p-4 space-y-2"
                onClick={() => toggleStatusCard(status)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
                    <span className="font-medium">{config.label}</span>
                  </div>
                  {isExpanded ? 
                    <ChevronUp className="h-4 w-4" /> : 
                    <ChevronDown className="h-4 w-4" />
                  }
                </div>
                
                <div className="text-2xl font-bold">{count}</div>
              </div>
              
              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t p-3 space-y-2">
                  {tokensWithStatus.length > 0 ? (
                    <>
                      {tokensWithStatus.slice(0, 3).map(token => (
                        <div 
                          key={token.id}
                          className="p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusCardTokenClick(token);
                          }}
                        >
                          <div className="font-medium text-sm">{token.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {token.symbol} • {token.standard}
                          </div>
                        </div>
                      ))}
                      {tokensWithStatus.length > 3 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewAllStatus(status);
                          }}
                        >
                          View All {tokensWithStatus.length}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      No tokens
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Filtering and Tab Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0 mb-6">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full lg:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All Tokens</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
            <TabsTrigger value="deployed">Deployed</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Standard Filter */}
              <div className="px-2 py-1.5 text-sm font-semibold">Filter by Standard</div>
              {['ERC-20', 'ERC-721', 'ERC-1155', 'ERC-1400', 'ERC-3525', 'ERC-4626'].map(standard => (
                <DropdownMenuCheckboxItem
                  key={standard}
                  checked={selectedStandards.includes(standard)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStandards([...selectedStandards, standard]);
                    } else {
                      setSelectedStandards(selectedStandards.filter(s => s !== standard));
                    }
                  }}
                >
                  {standard}
                </DropdownMenuCheckboxItem>
              ))}
              
              <DropdownMenuSeparator />
              
              {/* Status Filter */}
              <div className="px-2 py-1.5 text-sm font-semibold">Filter by Status</div>
              {availableStatuses.map(status => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={selectedStatuses.includes(status)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStatuses([...selectedStatuses, status]);
                    } else {
                      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
                    }
                  }}
                >
                  {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </DropdownMenuCheckboxItem>
              ))}
              
              {availableCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  
                  {/* Category Filter */}
                  <div className="px-2 py-1.5 text-sm font-semibold">Filter by Category</div>
                  {availableCategories.map(category => (
                    <DropdownMenuCheckboxItem
                      key={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCategories([...selectedCategories, category]);
                        } else {
                          setSelectedCategories(selectedCategories.filter(c => c !== category));
                        }
                      }}
                    >
                      {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Token Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredTokens.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTokens.map(token => (
            <OptimizedTokenCard
              key={token.id}
              token={token}
              onView={handleViewToken}
              onEdit={handleEditToken}
              onDeploy={handleDeployToken}
              onDelete={handleDeleteToken}
              onUpdateStatus={handleUpdateStatus}
              defaultExpanded={false}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground">
              {tokens.length === 0 ? (
                <>
                  <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No tokens created yet</h3>
                  <p className="mb-4">Create your first token to get started</p>
                  <Button onClick={() => navigate('/tokens/create')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Token
                  </Button>
                </>
              ) : (
                <>
                  <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No tokens match your filters</h3>
                  <p className="mb-4">Try adjusting your search or filter criteria</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedToken ? `${selectedToken.name} (${selectedToken.symbol})` : 'Token Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedToken && `${selectedToken.standard} token details`}
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedToken && detailData ? (
            <div className="space-y-6">
              {/* Basic Information Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-lg font-semibold">{selectedToken.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Blockchain</label>
                  <p className="text-lg">{selectedToken.blockchain || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-lg">{format(new Date(selectedToken.created_at), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Updated</label>
                  <p className="text-lg">{format(new Date(selectedToken.updated_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
              
              {/* Address if deployed */}
              {selectedToken.address && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Contract Address</label>
                  <p className="font-mono text-sm bg-muted p-2 rounded break-all">
                    {selectedToken.address}
                  </p>
                </div>
              )}

              {/* Blocks JSONB Data */}
              {detailData.blocks && Object.keys(detailData.blocks).length > 0 && (
                <BlocksDataDisplay 
                  blocks={detailData.blocks}
                  title="Token Configuration (blocks)"
                  compact={false}
                  maxInitialItems={6}
                />
              )}

              {/* Metadata JSONB Data */}
              {detailData.metadata && Object.keys(detailData.metadata).length > 0 && (
                <MetadataDisplay 
                  metadata={detailData.metadata}
                  title="Token Metadata"
                  compact={false}
                  maxInitialItems={8}
                />
              )}
              
              {/* Comprehensive Token Properties Display */}
              <UnifiedTokenDetail
                token={detailData}
                displayConfig={{
                  mode: 'detail',
                  layout: 'full',
                  showActions: false,
                  showMetadata: false,
                  showFeatures: true
                }}
                className="mt-6"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No details available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Transition Dialog */}
      {selectedToken && (
        <StatusTransitionDialog
          open={showStatusDialog}
          onOpenChange={setShowStatusDialog}
          token={{
            ...selectedToken,
            config_mode: selectedToken.config_mode as "min" | "max" | "basic" | "advanced",
            blocks: selectedToken.blocks || {},
            metadata: selectedToken.metadata || {},
            erc20Properties: undefined,
            erc721Properties: undefined,
            erc1155Properties: undefined,
            erc1400Properties: undefined,
            erc3525Properties: undefined,
            erc4626Properties: undefined
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <TokenDeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteToken}
        isProcessing={isDeleting}
        token={selectedToken}
      />

      {/* Edit Modal */}
      <TokenEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        token={selectedToken}
        onTokenUpdate={handleTokenUpdate}
      />
    </TokenPageLayout>
  );
};

export default OptimizedTokenDashboardPage;
