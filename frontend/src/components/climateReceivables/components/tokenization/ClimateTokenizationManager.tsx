import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, RefreshCw, Coins, Plus, MoreHorizontal, Check, X, Play, Pause, Pencil, FileUp, Trash2, ArrowUpDown, FileText, ClipboardCheck, CheckCircle, Upload, Share2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { EnhancedDataTable } from "@/components/ui/enhanced-data-table";
import { format, parseISO } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { debounce, throttle, memoize, processInChunks } from "../../utils/performance";
import { walletManager } from "@/services/wallet/WalletManager";
import { ClimateTokenizationPool, ClimateReceivable, RiskLevel, ClimateToken } from "../../types";

interface ClimateTokenizationManagerProps {
  projectId: string;
  projectName?: string;
}

interface TokenFormData {
  poolId: string;
  tokenName: string;
  tokenSymbol: string;
  totalTokens: number;
  initialTokenValue: number;
  securityInterestDetails: string;
  tokenStandard: "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-1400" | "ERC-3525" | "ERC-4626";
}

// Interface for pool value calculation return type
interface PoolValueData {
  faceValue: number;
  discountedValue: number;
  discountAmount: number;
  averageDiscountRate: number;
  totalValue: number;
}

const ClimateTokenizationManager: React.FC<ClimateTokenizationManagerProps> = ({ projectId, projectName }) => {
  const [pools, setPools] = useState<ClimateTokenizationPool[]>([]);
  const [tokens, setTokens] = useState<ClimateToken[]>([]);
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [selectedPool, setSelectedPool] = useState<ClimateTokenizationPool | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingToken, setCreatingToken] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tokenFormData, setTokenFormData] = useState<TokenFormData>({
    poolId: "",
    tokenName: "",
    tokenSymbol: "",
    totalTokens: 0,
    initialTokenValue: 0,
    securityInterestDetails: "",
    tokenStandard: "ERC-1155"
  });
  const [editingToken, setEditingToken] = useState<ClimateToken | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTokenFormData, setEditTokenFormData] = useState<TokenFormData>({
    poolId: "",
    tokenName: "",
    tokenSymbol: "",
    totalTokens: 0,
    initialTokenValue: 0,
    securityInterestDetails: "",
    tokenStandard: "ERC-1155"
  });
  const { toast } = useToast();

  // Wallet connection state and handlers
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState<boolean>(false);

  // Track fully allocated pools
  const [fullyAllocatedPoolIds, setFullyAllocatedPoolIds] = useState<string[]>([]);

  useEffect(() => {
    walletManager.getConnectedAddress().then(addr => setConnectedAddress(addr));
  }, []);

  const handleConnectWallet = async () => {
    setWalletLoading(true);
    const success = await walletManager.connectInjectedWallet();
    if (success) {
      const addr = await walletManager.getConnectedAddress();
      setConnectedAddress(addr);
    } else {
      toast({
        title: "Wallet Connection Failed",
        description: "No injected web3 provider found. Please install MetaMask or another compatible wallet.",
        variant: "destructive",
      });
    }
    setWalletLoading(false);
  };

  const handleDisconnectWallet = async () => {
    setWalletLoading(true);
    await walletManager.disconnectInjectedWallet();
    setConnectedAddress(null);
    setWalletLoading(false);
  };

  // Memoize calculation functions
  const getDiscountedPoolValue = useMemo(() => memoize((poolId: string): PoolValueData => {
    if (!poolId) return {
      faceValue: 0,
      discountedValue: 0,
      discountAmount: 0,
      averageDiscountRate: 0,
      totalValue: 0
    };
    
    const pool = pools.find(p => p.poolId === poolId);
    if (!pool) return {
      faceValue: 0,
      discountedValue: 0,
      discountAmount: 0,
      averageDiscountRate: 0,
      totalValue: 0
    };
    
    // Get all receivables in this pool
    const poolReceivables = receivables.filter(receivable => {
      // Check if receivable is in this pool (you'll need to fetch pool-receivable relationships)
      return true; // Simplified for now
    });
    
    // Calculate total face value
    const totalFaceValue = pool.totalValue || 0;
    
    // Calculate average risk score as discount rate proxy
    const totalRiskScore = poolReceivables.reduce((sum, receivable) => sum + (receivable.riskScore || 0), 0);
    const avgRiskScore = poolReceivables.length > 0 ? totalRiskScore / poolReceivables.length : 0;
    
    // Convert risk score to discount rate (simplified: higher risk = higher discount)
    const avgDiscountRate = avgRiskScore / 100; // Risk score 0-100 -> 0-100% discount
    
    // Calculate discounted value
    const totalDiscountedValue = totalFaceValue * (1 - avgDiscountRate);
    
    // Calculate total discount amount
    const discountAmount = totalFaceValue - totalDiscountedValue;
    
    return {
      faceValue: totalFaceValue,
      discountedValue: totalDiscountedValue,
      discountAmount,
      averageDiscountRate: avgDiscountRate,
      totalValue: totalFaceValue
    };
  }), [pools, receivables]);

  // Memoize the calculation functions
  const calculateTokenValue = useMemo(() => memoize((poolId: string, totalTokens: number): number => {
    if (!poolId || totalTokens <= 0) return 0;
    const { faceValue } = getDiscountedPoolValue(poolId);
    return faceValue / totalTokens;
  }), [getDiscountedPoolValue]);

  const calculateTokenQuantity = useMemo(() => memoize((poolId: string, initialTokenValue: number): number => {
    if (!poolId || initialTokenValue <= 0) return 0;
    const { faceValue } = getDiscountedPoolValue(poolId);
    return Math.floor(faceValue / initialTokenValue);
  }), [getDiscountedPoolValue]);

  // Use throttled version of fetchData to prevent rapid consecutive calls
  const throttledFetchData = useMemo(
    () => throttle(async () => {
      try {
        setLoading(true);
        
        // Fetch climate tokenization pools
        const { data: poolData, error: poolError } = await supabase
          .from("climate_tokenization_pools")
          .select("*")
          .order("created_at", { ascending: false });

        if (poolError) throw poolError;

        // Fetch climate receivables
        const { data: receivableData, error: receivableError } = await supabase
          .from("climate_receivables")
          .select("*");

        if (receivableError) throw receivableError;

        // Process receivables data
        const processReceivable = (item: any): ClimateReceivable => ({
          receivableId: item.receivable_id,
          assetId: item.asset_id,
          payerId: item.payer_id,
          amount: item.amount,
          dueDate: item.due_date,
          riskScore: item.risk_score,
          discountRate: item.discount_rate,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        });

        const formattedReceivables = await processInChunks(
          receivableData || [],
          processReceivable,
          50
        );

        // Process pools data
        const processPool = (item: any): ClimateTokenizationPool => ({
          poolId: item.pool_id,
          name: item.name,
          totalValue: item.total_value,
          riskProfile: item.risk_profile as RiskLevel,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        });

        const formattedPools = await processInChunks(
          poolData || [],
          processPool,
          20
        );

        // Fetch tokens from the tokens table (climate-specific)
        const { data: tokenData, error: tokenError } = await supabase
          .from("tokens")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });

        // Process token data
        const processToken = (item: any): ClimateToken | null => {
          const metadata = item.metadata as any || {};
          const climateData = metadata.climate || {};
          
          // Only include tokens that have climate metadata
          if (!climateData || climateData.source !== 'climate_tokenization') {
            return null;
          }
          
          let tokenStatus = climateData.status || 'draft';
          
          if (item.status) {
            tokenStatus = item.status;
          }
          
          return {
            id: item.id,
            poolId: String(climateData.pool_id || ""),
            tokenName: item.name,
            tokenSymbol: item.symbol,
            totalTokens: climateData.total_tokens || 0,
            tokenValue: climateData.token_value || 0,
            totalValue: climateData.total_value || 0,
            createdAt: item.created_at,
            status: tokenStatus,
            securityInterestDetails: climateData.security_interest_details || '',
            projectId: item.project_id,
            metadata: item.metadata,
            averageRiskScore: climateData.average_risk_score || 0,
            discountedValue: climateData.discounted_value || 0,
            discountAmount: climateData.discount_amount || 0,
            averageDiscountRate: climateData.average_discount_rate || 0,
            poolDetails: formattedPools.find(p => p.poolId === String(climateData.pool_id)),
          };
        };

        let formattedTokens: ClimateToken[] = [];
        if (!tokenError && tokenData) {
          const processedTokens = await processInChunks(
            tokenData,
            processToken,
            30
          );
          formattedTokens = processedTokens.filter(Boolean) as ClimateToken[];
        }

        // Identify pools with distributed tokens
        const distributedPoolIds = formattedTokens
          .filter(token => token.status === 'distributed')
          .map(token => String(token.poolId));

        setFullyAllocatedPoolIds(distributedPoolIds);

        // Update the state
        setPools(formattedPools);
        setTokens(formattedTokens);
        setReceivables(formattedReceivables);
        
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load tokenization data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }, 300),
    [projectId, toast]
  );

  useEffect(() => {
    throttledFetchData();
  }, [throttledFetchData]);

  // Debounce the input handlers
  const handleInitialTokenValueChange = useCallback(debounce((value: string) => {
    const initialValue = parseFloat(value) || 0;
    
    setTokenFormData(prev => {
      if (initialValue <= 0 || !prev.poolId) {
        return {
          ...prev,
          initialTokenValue: initialValue,
          totalTokens: 0
        };
      }
      
      const tokenQuantity = calculateTokenQuantity(prev.poolId, initialValue);
      
      return {
        ...prev,
        initialTokenValue: initialValue,
        totalTokens: tokenQuantity
      };
    });
  }, 300), [calculateTokenQuantity]);

  const handleTotalTokensChange = useCallback(debounce((value: string) => {
    const tokenCount = parseInt(value) || 0;
    
    setTokenFormData(prev => {
      if (tokenCount <= 0 || !prev.poolId) {
        return {
          ...prev,
          totalTokens: tokenCount,
          initialTokenValue: 0
        };
      }
      
      const tokenValue = calculateTokenValue(prev.poolId, tokenCount);
      
      return {
        ...prev,
        totalTokens: tokenCount,
        initialTokenValue: tokenValue
      };
    });
  }, 300), [calculateTokenValue]);

  const handlePoolSelect = (poolId: string) => {
    const pool = pools.find(p => p.poolId === poolId);
    setSelectedPool(pool || null);
    
    if (pool) {
      setTokenFormData(prev => ({
        ...prev,
        poolId: pool.poolId,
        tokenName: `${projectName || 'Climate'} ${pool.name} Token`,
        tokenSymbol: `CLM${pool.poolId.slice(-4).toUpperCase()}`,
      }));
    }
  };

  const handleCreateToken = async () => {
    if (!selectedPool) return;
    
    try {
      setCreatingToken(true);
      
      const tokenValue = calculateTokenValue(selectedPool.poolId, tokenFormData.totalTokens);
      const { faceValue, discountedValue, discountAmount, averageDiscountRate } = getDiscountedPoolValue(selectedPool.poolId);
      
      // Calculate average risk score from pool
      const avgRiskScore = receivables.length > 0 
        ? receivables.reduce((sum, r) => sum + (r.riskScore || 0), 0) / receivables.length 
        : 0;
      
      const tokenInsertData = {
        name: tokenFormData.tokenName,
        symbol: tokenFormData.tokenSymbol,
        project_id: projectId,
        standard: tokenFormData.tokenStandard,
        blocks: {},
        decimals: 18,
        total_supply: String(tokenFormData.totalTokens),
        metadata: {
          climate: {
            source: 'climate_tokenization',
            pool_id: selectedPool.poolId,
            total_tokens: tokenFormData.totalTokens,
            token_value: tokenFormData.initialTokenValue,
            total_value: selectedPool.totalValue || 0,
            security_interest_details: tokenFormData.securityInterestDetails,
            status: 'draft' as const,
            average_risk_score: avgRiskScore,
            discounted_value: discountedValue,
            discount_amount: discountAmount,
            average_discount_rate: averageDiscountRate,
            pool_name: selectedPool.name
          }
        },
        status: "DRAFT" as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from("tokens")
        .insert(tokenInsertData)
        .select("*")
        .single();
        
      if (error) throw error;

      // Create climate token properties record
      const climatePropertiesData = {
        token_id: data.id,
        pool_id: selectedPool.poolId,
        average_risk_score: avgRiskScore,
        discounted_value: discountedValue,
        discount_amount: discountAmount,
        average_discount_rate: averageDiscountRate,
        security_interest_details: tokenFormData.securityInterestDetails
      };

      const { error: propertiesError } = await supabase
        .from("token_climate_properties")
        .insert(climatePropertiesData);

      if (propertiesError) throw propertiesError;
      
      setCreateDialogOpen(false);
      toast({
        title: "Token Created",
        description: `Successfully created ${tokenFormData.tokenName} token`,
        variant: "default",
      });
      
      // Reset form
      setTokenFormData({
        poolId: "",
        tokenName: "",
        tokenSymbol: "",
        totalTokens: 0,
        initialTokenValue: 0,
        securityInterestDetails: "",
        tokenStandard: "ERC-1155",
      });
      setSelectedPool(null);
      
      throttledFetchData();
    } catch (error) {
      console.error("Error creating token:", error);
      toast({
        title: "Error",
        description: "Failed to create token: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setCreatingToken(false);
    }
  };

  const handleEditTokenClick = async (token: ClimateToken) => {
    setEditingToken(token);
    const { data } = await supabase
      .from('tokens')
      .select('standard')
      .eq('id', token.id)
      .single();
      
    setEditTokenFormData({
      poolId: String(token.poolId),
      tokenName: token.tokenName,
      tokenSymbol: token.tokenSymbol,
      totalTokens: token.totalTokens,
      initialTokenValue: token.tokenValue,
      securityInterestDetails: token.securityInterestDetails || "",
      tokenStandard: data?.standard as "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-1400" | "ERC-3525" | "ERC-4626" || "ERC-1155"
    });
    setEditDialogOpen(true);
  };

  const handleSaveTokenEdit = async () => {
    if (!editingToken) return;
    
    try {
      setCreatingToken(true);
      
      const { data: currentToken, error: fetchError } = await supabase
        .from("tokens")
        .select("*")
        .eq("id", editingToken.id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const metadata = currentToken?.metadata as any || {};
      if (metadata.climate) {
        metadata.climate = {
          ...metadata.climate,
          source: 'climate_tokenization',
          pool_id: editTokenFormData.poolId,
          total_tokens: editTokenFormData.totalTokens,
          token_value: editTokenFormData.initialTokenValue,
          security_interest_details: editTokenFormData.securityInterestDetails,
          pool_name: pools.find(p => p.poolId === editTokenFormData.poolId)?.name || "Unknown Pool"
        };
      }
      
      const { error } = await supabase
        .from("tokens")
        .update({
          name: editTokenFormData.tokenName,
          symbol: editTokenFormData.tokenSymbol,
          standard: editTokenFormData.tokenStandard,
          total_supply: String(editTokenFormData.totalTokens),
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingToken.id);
        
      if (error) throw error;
      
      setEditDialogOpen(false);
      toast({
        title: "Token Updated",
        description: `Successfully updated ${editTokenFormData.tokenName} token`,
        variant: "default",
      });
      
      setEditingToken(null);
      setEditTokenFormData({
        poolId: "",
        tokenName: "",
        tokenSymbol: "",
        totalTokens: 0,
        initialTokenValue: 0,
        securityInterestDetails: "",
        tokenStandard: "ERC-1155",
      });
      
      throttledFetchData();
    } catch (error) {
      console.error("Error updating token:", error);
      toast({
        title: "Error",
        description: "Failed to update token: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setCreatingToken(false);
    }
  };

  const handleDeleteToken = async (token: ClimateToken) => {
    try {
      const confirmed = window.confirm(`Are you sure you want to delete the token "${token.tokenName}"?`);
      if (!confirmed) return;
      
      setLoading(true);
      
      // Delete climate properties first (due to foreign key constraint)
      await supabase
        .from("token_climate_properties")
        .delete()
        .eq("token_id", token.id);
      
      const { error } = await supabase
        .from("tokens")
        .delete()
        .eq("id", token.id);
        
      if (error) throw error;
      
      toast({
        title: "Token Deleted",
        description: `Successfully deleted ${token.tokenName} token`,
        variant: "default",
      });
      
      throttledFetchData();
    } catch (error) {
      console.error("Error deleting token:", error);
      toast({
        title: "Error",
        description: "Failed to delete token: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTokenStatus = async (token: ClimateToken, newStatus: string) => {
    try {
      setCreatingToken(true);
      
      const { data: currentToken, error: fetchError } = await supabase
        .from("tokens")
        .select("*")
        .eq("id", token.id)
        .single();
        
      if (fetchError) throw fetchError;
      
      const metadata = currentToken?.metadata as any || {};
      if (metadata.climate) {
        metadata.climate.status = newStatus as "DRAFT" | "UNDER REVIEW" | "APPROVED" | "READY TO MINT" | "MINTED" | "DEPLOYED" | "PAUSED" | "DISTRIBUTED" | "REJECTED";
      }
      
      const formattedStatus = newStatus.toUpperCase().replace(/_/g, ' ');
      
      const { error } = await supabase
        .from("tokens")
        .update({
          status: formattedStatus as "DRAFT" | "UNDER REVIEW" | "APPROVED" | "READY TO MINT" | "MINTED" | "DEPLOYED" | "PAUSED" | "DISTRIBUTED" | "REJECTED",
          metadata: metadata,
          updated_at: new Date().toISOString()
        })
        .eq("id", token.id);
        
      if (error) throw error;
      
      toast({
        title: "Token Status Updated",
        description: `Successfully updated ${token.tokenName} status to ${newStatus}`,
        variant: "default",
      });
      
      throttledFetchData();
    } catch (error) {
      console.error("Error updating token status:", error);
      toast({
        title: "Error",
        description: "Failed to update token status: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setCreatingToken(false);
    }
  };

  const getStatusBadge = (status: string) => {
    let badgeClass = "";
    let statusLabel = "";
    
    const normalizedStatus = status.toUpperCase();
    
    switch (normalizedStatus) {
      case "DRAFT":
        badgeClass = "bg-slate-100 text-slate-800 border-slate-200";
        statusLabel = "Draft";
        break;
      case "UNDER REVIEW":
        badgeClass = "bg-yellow-100 text-yellow-800 border-yellow-200";
        statusLabel = "Under Review";
        break;
      case "APPROVED":
        badgeClass = "bg-green-100 text-green-800 border-green-200";
        statusLabel = "Approved";
        break;
      case "READY TO MINT":
        badgeClass = "bg-indigo-100 text-indigo-800 border-indigo-200";
        statusLabel = "Ready to Mint";
        break;
      case "MINTED":
        badgeClass = "bg-blue-100 text-blue-800 border-blue-200";
        statusLabel = "Minted";
        break;
      case "DEPLOYED":
        badgeClass = "bg-purple-100 text-purple-800 border-purple-200";
        statusLabel = "Deployed";
        break;
      case "PAUSED":
        badgeClass = "bg-orange-100 text-orange-800 border-orange-200";
        statusLabel = "Paused";
        break;
      case "DISTRIBUTED":
        badgeClass = "bg-teal-100 text-teal-800 border-teal-200";
        statusLabel = "Distributed";
        break;
      case "REJECTED":
        badgeClass = "bg-red-100 text-red-800 border-red-200";
        statusLabel = "Rejected";
        break;
      default:
        badgeClass = "bg-gray-100 text-gray-800 border-gray-200";
        statusLabel = status
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
    }
    
    return <Badge variant="outline" className={badgeClass}>{statusLabel}</Badge>;
  };
  
  // Define column definitions for tokens table
  const tokenColumns = useMemo<ColumnDef<ClimateToken, any>[]>(() => [
    {
      accessorKey: "tokenName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Token Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
    },
    {
      accessorKey: "tokenSymbol",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Symbol
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
    },
    {
      accessorKey: "poolName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Pool
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
      cell: ({ row }) => {
        const token = row.original;
        const pool = pools.find(p => p.poolId === token.poolId);
        return pool?.name || "Unknown Pool";
      },
      accessorFn: (row) => {
        const pool = pools.find(p => p.poolId === row.poolId);
        return pool?.name || "Unknown Pool";
      },
    },
    {
      accessorKey: "riskProfile",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Risk Profile
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
      cell: ({ row }) => {
        const token = row.original;
        const pool = pools.find(p => p.poolId === token.poolId);
        return pool?.riskProfile || "Unknown";
      },
      accessorFn: (row) => {
        const pool = pools.find(p => p.poolId === row.poolId);
        return pool?.riskProfile || "Unknown";
      },
    },
    {
      accessorKey: "totalValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Total Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "right" },
      cell: ({ row }) => 
        new Intl.NumberFormat('en-US', {
          style: 'currency', 
          currency: 'USD',
          maximumFractionDigits: 2
        }).format(row.original.totalValue),
    },
    {
      accessorKey: "discountedValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Purchase Price
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const token = row.original;
        return (
          <>
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              maximumFractionDigits: 2
            }).format(token.discountedValue || 0)}
            {token.averageDiscountRate ? (
              <span className="text-xs text-muted-foreground ml-1">
                ({(token.averageDiscountRate * 100).toFixed(2)}% discount)
              </span>
            ) : null}
          </>
        );
      },
      accessorFn: (row) => row.discountedValue || 0,
    },
    {
      accessorKey: "totalTokens",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Total Tokens
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "right" },
      cell: ({ row }) => 
        new Intl.NumberFormat('en-US').format(row.original.totalTokens),
    },
    {
      accessorKey: "tokenValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Token Value
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "right" },
      cell: ({ row }) => 
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 4,
          maximumFractionDigits: 4
        }).format(row.original.tokenValue),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="p-0"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      enableSorting: true,
      meta: { alignment: "left" },
      cell: ({ row }) => {
        const token = row.original;
        return getStatusBadge(token.status);
      },
    },
    {
      id: "actions",
      header: "Actions",
      meta: { alignment: "right" },
      cell: ({ row }) => {
        const token = row.original;
        return (
          <div className="flex space-x-1 justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleEditTokenClick(token)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Status
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'draft')}>
                      <FileText className="h-4 w-4 mr-2" />
                      Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'under_review')}>
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Under Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'approved')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approved
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'ready_to_mint')}>
                      <FileUp className="h-4 w-4 mr-2" />
                      Ready to Mint
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'minted')}>
                      <Coins className="h-4 w-4 mr-2" />
                      Minted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'deployed')}>
                      <Upload className="h-4 w-4 mr-2" />
                      Deployed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'paused')}>
                      <Pause className="h-4 w-4 mr-2" />
                      Paused
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'distributed')}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Distributed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'rejected')}>
                      <X className="h-4 w-4 mr-2" />
                      Rejected
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSeparator />
                
                {token.status.toLowerCase() === 'draft' && (
                  <DropdownMenuItem onClick={() => handleChangeTokenStatus(token, 'under_review')}>
                    <Check className="h-4 w-4 mr-2" />
                    Submit for Review
                  </DropdownMenuItem>
                )}
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem 
                  onClick={() => handleDeleteToken(token)}
                  className="text-destructive focus:text-destructive"
                  disabled={token.status !== 'draft' && token.status !== 'rejected'}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      enableSorting: false,
    },
  ], [pools, handleEditTokenClick, handleChangeTokenStatus, handleDeleteToken]);

  const renderTokensTable = useMemo(() => () => (
    <EnhancedDataTable
      columns={tokenColumns}
      data={tokens}
      searchKey="tokenName"
      searchPlaceholder="Search tokens..."
      exportFilename={`${projectName || 'climate'}-tokens`}
    />
  ), [tokens, tokenColumns, projectName]);

  return (
    <div className="w-full">
      <div className="flex justify-end mb-4 space-x-2">
        {connectedAddress ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">{connectedAddress}</span>
            <Button size="sm" variant="outline" onClick={handleDisconnectWallet} disabled={walletLoading}>
              Disconnect
            </Button>
          </div>
        ) : (
          <Button size="sm" onClick={handleConnectWallet} disabled={walletLoading}>
            {walletLoading ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={throttledFetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Climate Receivables Token</DialogTitle>
              <DialogDescription>
                Tokenize a pool of climate receivables to create an investment token.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="poolId">Select Pool</Label>
                <Select
                  value={selectedPool ? selectedPool.poolId : ""}
                  onValueChange={handlePoolSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pool" />
                  </SelectTrigger>
                  <SelectContent>
                    {pools.map((pool) => {
                      const isFullyAllocated = fullyAllocatedPoolIds.includes(pool.poolId);
                      return (
                        <SelectItem 
                          key={pool.poolId} 
                          value={pool.poolId}
                          disabled={isFullyAllocated}
                          className={isFullyAllocated ? "text-muted-foreground" : ""}
                        >
                          {pool.name} - ${(pool.totalValue || 0).toFixed(2)} ({pool.riskProfile})
                          {isFullyAllocated && " (Fully allocated)"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPool && (
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm">Pool Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Risk Profile</p>
                        <p className="font-medium">{selectedPool.riskProfile}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="font-medium">${(selectedPool.totalValue || 0).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Pool ID</p>
                        <p className="font-medium text-xs">{selectedPool.poolId.slice(-8)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    value={tokenFormData.tokenName}
                    onChange={(e) => setTokenFormData(prev => ({
                      ...prev,
                      tokenName: e.target.value,
                    }))}
                    placeholder="Enter token name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenSymbol">Token Symbol</Label>
                  <Input
                    id="tokenSymbol"
                    value={tokenFormData.tokenSymbol}
                    onChange={(e) => setTokenFormData(prev => ({
                      ...prev,
                      tokenSymbol: e.target.value,
                    }))}
                    placeholder="Enter token symbol"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="initialTokenValue">Initial Token Value ($)</Label>
                  <Input
                    id="initialTokenValue"
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={tokenFormData.initialTokenValue.toFixed(4)}
                    onChange={(e) => handleInitialTokenValueChange(e.target.value)}
                    placeholder="Enter token value"
                  />
                  <p className="text-xs text-muted-foreground">
                    The initial value of each token in USD (affects total quantity)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="totalTokens">Total Tokens</Label>
                  <Input
                    id="totalTokens"
                    type="number"
                    value={tokenFormData.totalTokens}
                    onChange={(e) => handleTotalTokensChange(e.target.value)}
                    placeholder="Enter total tokens"
                  />
                  <p className="text-xs text-muted-foreground">
                    Total number of tokens to create (pool value ÷ token value)
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenStandard">Token Standard</Label>
                <Select
                  value={tokenFormData.tokenStandard}
                  onValueChange={(value) => setTokenFormData(prev => ({
                    ...prev,
                    tokenStandard: value as "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-1400" | "ERC-3525" | "ERC-4626"
                  }))}
                >
                  <SelectTrigger id="tokenStandard" className="w-full">
                    <SelectValue placeholder="Select token standard" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ERC-20">ERC-20 (Fungible)</SelectItem>
                    <SelectItem value="ERC-721">ERC-721 (Non-Fungible)</SelectItem>
                    <SelectItem value="ERC-1155">ERC-1155 (Multi-Token)</SelectItem>
                    <SelectItem value="ERC-1400">ERC-1400 (Security Token)</SelectItem>
                    <SelectItem value="ERC-3525">ERC-3525 (Semi-Fungible)</SelectItem>
                    <SelectItem value="ERC-4626">ERC-4626 (Tokenized Vault)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The blockchain token standard to use for this token
                </p>
              </div>
              
              {selectedPool && (
                <div className="space-y-1 p-4 border rounded-md bg-muted/30">
                  <h4 className="font-medium text-sm">Token Economics</h4>
                  {(() => {
                    const { faceValue, discountedValue, discountAmount, averageDiscountRate } = getDiscountedPoolValue(selectedPool.poolId);
                    const tokenValue = calculateTokenValue(selectedPool.poolId, tokenFormData.totalTokens);
                    return (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Pool Value: </span>
                          <span className="font-medium">${faceValue.toFixed(2)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Purchase Price: </span>
                          <span className="font-medium">${discountedValue.toFixed(2)}</span>
                          <span className="text-muted-foreground text-xs ml-1">
                            ({(averageDiscountRate * 100).toFixed(2)}% discount)
                          </span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total Discount: </span>
                          <span className="font-medium">${discountAmount.toFixed(2)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Token Value: </span>
                          <span className="font-medium">${tokenValue.toFixed(4)}</span>
                          <span className="text-muted-foreground text-xs ml-1">per token</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Total Tokens: </span>
                          <span className="font-medium">{tokenFormData.totalTokens.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="securityInterest">Security Interest Details</Label>
                <Textarea
                  id="securityInterest"
                  value={tokenFormData.securityInterestDetails}
                  onChange={(e) => setTokenFormData(prev => ({
                    ...prev,
                    securityInterestDetails: e.target.value,
                  }))}
                  rows={3}
                  placeholder="Describe the security interest details for this token..."
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreateToken}
                disabled={creatingToken || !selectedPool || !tokenFormData.tokenName || !tokenFormData.tokenSymbol || tokenFormData.totalTokens <= 0}
              >
                {creatingToken ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Create Token
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Climate Receivables Tokens</CardTitle>
          <CardDescription>
            Manage and view all tokenized climate receivables pools. Tokens can be allocated and distributed to investors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Coins className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Tokens Created</h3>
              <p className="text-muted-foreground mt-2">
                Create your first climate receivables token by tokenizing a pool.
              </p>
              <Button 
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Token
              </Button>
            </div>
          ) : (
            renderTokensTable()
          )}
        </CardContent>
      </Card>

      {/* Edit Token Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Climate Receivables Token</DialogTitle>
            <DialogDescription>
              Update token information
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="poolId">Select Pool</Label>
              <Select
                value={editTokenFormData.poolId}
                onValueChange={(value) => setEditTokenFormData(prev => ({
                  ...prev,
                  poolId: value
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((pool) => (
                    <SelectItem key={pool.poolId} value={pool.poolId}>
                      {pool.name} - ${(pool.totalValue || 0).toFixed(2)} ({pool.riskProfile})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input
                  id="tokenName"
                  value={editTokenFormData.tokenName}
                  onChange={(e) => setEditTokenFormData(prev => ({
                    ...prev,
                    tokenName: e.target.value,
                  }))}
                  placeholder="Enter token name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tokenSymbol">Token Symbol</Label>
                <Input
                  id="tokenSymbol"
                  value={editTokenFormData.tokenSymbol}
                  onChange={(e) => setEditTokenFormData(prev => ({
                    ...prev,
                    tokenSymbol: e.target.value,
                  }))}
                  placeholder="Enter token symbol"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initialTokenValue">Initial Token Value ($)</Label>
                <Input
                  id="initialTokenValue"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={editTokenFormData.initialTokenValue.toFixed(4)}
                  onChange={(e) => setEditTokenFormData(prev => ({
                    ...prev,
                    initialTokenValue: parseFloat(e.target.value) || 0,
                  }))}
                  placeholder="Enter token value"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="totalTokens">Total Tokens</Label>
                <Input
                  id="totalTokens"
                  type="number"
                  value={editTokenFormData.totalTokens}
                  onChange={(e) => setEditTokenFormData(prev => ({
                    ...prev,
                    totalTokens: parseInt(e.target.value) || 0,
                  }))}
                  placeholder="Enter total tokens"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="securityInterest">Security Interest Details</Label>
              <Textarea
                id="securityInterest"
                value={editTokenFormData.securityInterestDetails}
                onChange={(e) => setEditTokenFormData(prev => ({
                  ...prev,
                  securityInterestDetails: e.target.value,
                }))}
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editTokenStandard">Token Standard</Label>
              <Select
                value={editTokenFormData.tokenStandard}
                onValueChange={(value) => setEditTokenFormData(prev => ({
                  ...prev,
                  tokenStandard: value as "ERC-20" | "ERC-721" | "ERC-1155" | "ERC-1400" | "ERC-3525" | "ERC-4626"
                }))}
              >
                <SelectTrigger id="editTokenStandard">
                  <SelectValue placeholder="Select token standard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ERC-20">ERC-20 (Fungible)</SelectItem>
                  <SelectItem value="ERC-721">ERC-721 (Non-Fungible)</SelectItem>
                  <SelectItem value="ERC-1155">ERC-1155 (Multi-Token)</SelectItem>
                  <SelectItem value="ERC-1400">ERC-1400 (Security Token)</SelectItem>
                  <SelectItem value="ERC-3525">ERC-3525 (Semi-Fungible)</SelectItem>
                  <SelectItem value="ERC-4626">ERC-4626 (Tokenized Vault)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Change the blockchain token standard for this token
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveTokenEdit}
              disabled={creatingToken || !editTokenFormData.poolId || !editTokenFormData.tokenName || !editTokenFormData.tokenSymbol}
            >
              {creatingToken ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default React.memo(ClimateTokenizationManager);
