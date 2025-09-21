/**
 * Signature Collection Dashboard
 * Central hub for managing multi-signature transaction proposals
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  TrendingUp,
  Users,
  Shield,
  Hash,
  ArrowUpRight,
  Copy,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/database/client';
import { multiSigTransactionService } from '@/services/wallet/multiSig';
import { ChainType } from '@/services/wallet/AddressUtils';
import { TransactionProposal } from './TransactionProposal';

// ============================================================================
// INTERFACES
// ============================================================================

interface Proposal {
  id: string;
  walletId: string;
  walletName: string;
  transactionHash: string;
  chainType: ChainType;
  status: 'pending' | 'signed' | 'executed' | 'expired' | 'rejected';
  signaturesCollected: number;
  signaturesRequired: number;
  value: string;
  to: string;
  expiresAt: Date;
  createdAt: Date;
  canSign: boolean;
  canExecute: boolean;
}

interface DashboardStats {
  totalProposals: number;
  pendingProposals: number;
  readyToExecute: number;
  expiringSoon: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SignatureCollectionDashboard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalProposals: 0,
    pendingProposals: 0,
    readyToExecute: 0,
    expiringSoon: 0,
  });
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [isTestMode] = useState(false); // Production mode enabled

  // Load proposals on mount
  useEffect(() => {
    loadProposals();
    // Set up real-time subscription
    const subscription = supabase
      .channel('multi_sig_proposals')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'multi_sig_proposals' 
      }, () => {
        loadProposals();
      })
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...proposals];
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.id.includes(searchTerm) ||
        p.walletName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.to.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Chain filter
    if (chainFilter !== 'all') {
      filtered = filtered.filter(p => p.chainType === chainFilter);
    }
    
    setFilteredProposals(filtered);
  }, [proposals, searchTerm, statusFilter, chainFilter]);

  // Calculate stats
  useEffect(() => {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    setStats({
      totalProposals: proposals.length,
      pendingProposals: proposals.filter(p => p.status === 'pending').length,
      readyToExecute: proposals.filter(p => p.canExecute).length,
      expiringSoon: proposals.filter(p => 
        p.status === 'pending' && 
        new Date(p.expiresAt) < oneDayFromNow
      ).length,
    });
  }, [proposals]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      
      if (isTestMode) {
        // Generate test proposals
        const testProposals: Proposal[] = [
          {
            id: '1a2b3c4d-5e6f-7890-abcd-ef1234567890',
            walletId: 'wallet-1',
            walletName: 'Treasury Wallet',
            transactionHash: '0x' + '0'.repeat(64),
            chainType: ChainType.ETHEREUM,
            status: 'pending',
            signaturesCollected: 2,
            signaturesRequired: 3,
            value: '5.0 ETH',
            to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            canSign: true,
            canExecute: false,
          },
          {
            id: '2b3c4d5e-6f78-90ab-cdef-123456789012',
            walletId: 'wallet-2',
            walletName: 'Operations Wallet',
            transactionHash: '0x' + '1'.repeat(64),
            chainType: ChainType.POLYGON,
            status: 'pending',
            signaturesCollected: 3,
            signaturesRequired: 3,
            value: '1000 MATIC',
            to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            canSign: false,
            canExecute: true,
          },
          {
            id: '3c4d5e6f-7890-abcd-ef12-345678901234',
            walletId: 'wallet-3',
            walletName: 'Development Fund',
            transactionHash: '0x' + '2'.repeat(64),
            chainType: ChainType.ARBITRUM,
            status: 'executed',
            signaturesCollected: 2,
            signaturesRequired: 2,
            value: '0.5 ETH',
            to: '0x5B38Da6a701c568545dCfcB03FcB875f56beddC4',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
            canSign: false,
            canExecute: false,
          },
          {
            id: '4d5e6f78-90ab-cdef-1234-567890123456',
            walletId: 'wallet-1',
            walletName: 'Treasury Wallet',
            transactionHash: '0x' + '3'.repeat(64),
            chainType: ChainType.ETHEREUM,
            status: 'pending',
            signaturesCollected: 1,
            signaturesRequired: 3,
            value: '10.0 ETH',
            to: '0x17F6AD8Ef982297579C203069C1DbfFE4348c372',
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000), // Expiring soon
            createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
            canSign: true,
            canExecute: false,
          },
        ];
        
        setProposals(testProposals);
      } else {
        // Load real proposals from database
        const { data: proposalsData, error } = await supabase
          .from('multi_sig_proposals')
          .select(`
            *,
            multi_sig_wallets!inner(
              id,
              name,
              blockchain,
              threshold,
              owners
            )
          `)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // Transform data
        const transformedProposals: Proposal[] = (proposalsData || []).map(p => ({
          id: p.id,
          walletId: p.wallet_id,
          walletName: p.multi_sig_wallets.name,
          transactionHash: p.transaction_hash,
          chainType: p.chain_type as ChainType,
          status: p.status,
          signaturesCollected: p.signatures_collected,
          signaturesRequired: p.signatures_required,
          value: p.raw_transaction.value || '0',
          to: p.raw_transaction.to,
          expiresAt: new Date(p.expires_at),
          createdAt: new Date(p.created_at),
          canSign: p.status === 'pending' && p.signatures_collected < p.signatures_required,
          canExecute: p.status === 'pending' && p.signatures_collected >= p.signatures_required,
        }));
        
        setProposals(transformedProposals);
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
      toast({
        variant: "destructive",
        title: "Failed to load proposals",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = () => {
    navigate('/wallets?tab=transfer&mode=multisig');
  };

  const handleRefresh = () => {
    loadProposals();
    toast({
      title: "Refreshed",
      description: "Proposals have been updated",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pending</Badge>;
      case 'signed':
        return <Badge variant="secondary">Signed</Badge>;
      case 'executed':
        return <Badge className="bg-green-500">Executed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChainBadge = (chain: ChainType) => {
    const colors: Record<string, string> = {
      [ChainType.ETHEREUM]: 'bg-blue-500',
      [ChainType.POLYGON]: 'bg-purple-500',
      [ChainType.ARBITRUM]: 'bg-orange-500',
      [ChainType.OPTIMISM]: 'bg-red-500',
      [ChainType.BASE]: 'bg-blue-600',
    };
    
    return (
      <Badge className={`${colors[chain] || 'bg-gray-500'} text-white`}>
        {chain}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Multi-Sig Dashboard
          </h2>
          <p className="text-muted-foreground">
            Manage and track multi-signature transaction proposals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleCreateProposal}>
            <Plus className="mr-2 h-4 w-4" />
            New Proposal
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProposals}</div>
            <p className="text-xs text-muted-foreground">
              Across all wallets
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingProposals}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting signatures
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Execute</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.readyToExecute}</div>
            <p className="text-xs text-muted-foreground">
              Threshold met
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
            <p className="text-xs text-muted-foreground">
              Within 24 hours
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs defaultValue="proposals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
          <TabsTrigger value="details">Proposal Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="proposals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transaction Proposals</CardTitle>
                {isTestMode && (
                  <Badge variant="secondary">Test Mode</Badge>
                )}
              </div>
              <CardDescription>
                Review and manage pending multi-signature transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search proposals..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="executed">Executed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={chainFilter} onValueChange={setChainFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by chain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Chains</SelectItem>
                    <SelectItem value={ChainType.ETHEREUM}>Ethereum</SelectItem>
                    <SelectItem value={ChainType.POLYGON}>Polygon</SelectItem>
                    <SelectItem value={ChainType.ARBITRUM}>Arbitrum</SelectItem>
                    <SelectItem value={ChainType.OPTIMISM}>Optimism</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Proposals Table */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredProposals.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No proposals found</AlertTitle>
                  <AlertDescription>
                    {searchTerm || statusFilter !== 'all' || chainFilter !== 'all' 
                      ? "Try adjusting your filters" 
                      : "Create a new proposal to get started"}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Chain</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Signatures</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProposals.map((proposal) => (
                        <TableRow key={proposal.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs">
                                {proposal.id.substring(0, 8)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(proposal.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {proposal.walletName}
                          </TableCell>
                          <TableCell>
                            {getChainBadge(proposal.chainType)}
                          </TableCell>
                          <TableCell>{proposal.value}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {proposal.signaturesCollected} / {proposal.signaturesRequired}
                              </span>
                              {proposal.canExecute && (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(proposal.status)}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(proposal.expiresAt), 'MMM dd, HH:mm')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProposal(proposal.id)}
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          {selectedProposal ? (
            <TransactionProposal
              proposalId={selectedProposal}
              walletId={proposals.find(p => p.id === selectedProposal)?.walletId || ''}
              isSimulation={isTestMode}
              onSign={() => loadProposals()}
              onExecute={() => loadProposals()}
              onShare={() => {
                copyToClipboard(`${window.location.origin}/proposals/${selectedProposal}`);
                toast({
                  title: "Link copied",
                  description: "Share this link with other signers",
                });
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-8">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No proposal selected</AlertTitle>
                  <AlertDescription>
                    Select a proposal from the list to view details
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SignatureCollectionDashboard;