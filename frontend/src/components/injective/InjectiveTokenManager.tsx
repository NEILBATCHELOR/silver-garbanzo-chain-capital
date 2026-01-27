import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Coins,
  ExternalLink,
  Loader2,
  Plus,
  Minus,
  Settings,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Copy,
  CheckCircle2,
  ArrowLeftRight,
  Filter
} from 'lucide-react';
import { MTSUtilities, mtsUtilitiesTestnet, mtsUtilitiesMainnet } from '@/services/wallet/injective';
import { Network } from '@injectivelabs/networks';
import { cn } from '@/utils/utils';
import { supabase } from '@/infrastructure/database/client';

/**
 * Enhanced Injective Token Manager with MTS Integration and Project Awareness
 * 
 * Features:
 * - Project-scoped token listing
 * - Shows MTS status (EVM-compatible yes/no)
 * - Displays both Native denom and EVM address
 * - Mint, burn, metadata, market actions
 * - MTS cross-VM transfers
 */

interface Token {
  id: string;
  project_id: string | null;
  denom: string;
  subdenom: string;
  creator_address: string;
  total_supply: string;
  circulating_supply: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  admin_address: string;
  network: 'mainnet' | 'testnet';
  status: string;
  created_at: string;
  // MTS fields (calculated)
  mts_enabled?: boolean;
  evm_address?: string;
}

interface Wallet {
  id: string;
  wallet_address: string;
  wallet_type: string;
  net: string;
  non_evm_network: string | null;
}

interface ActionResult {
  success: boolean;
  message?: string;
  txHash?: string;
}

interface InjectiveTokenManagerProps {
  projectId?: string;
  showProjectFilter?: boolean;
}

export const InjectiveTokenManager: React.FC<InjectiveTokenManagerProps> = ({ 
  projectId,
  showProjectFilter = true 
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('testnet');
  const [filterByProject, setFilterByProject] = useState(!!projectId);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [copiedDenom, setCopiedDenom] = useState<string | null>(null);

  // Wallet states
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [walletsLoading, setWalletsLoading] = useState(false);

  // Action states
  const [actionType, setActionType] = useState<'mint' | 'burn' | 'metadata' | 'market' | 'mts' | 'batch-mint' | 'batch-burn' | null>(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionRecipient, setActionRecipient] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // Batch operation state
  const [batchRecipients, setBatchRecipients] = useState<Array<{ address: string; amount: string; displayAmount: string }>>([
    { address: '', amount: '', displayAmount: '' }
  ]);

  // Load tokens
  useEffect(() => {
    loadTokens();
  }, [network, projectId, filterByProject]);

  // Load Injective wallets
  const loadWallets = async () => {
    setWalletsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Query project_wallets for Injective wallets matching the current network
      const { data, error } = await supabase
        .from('project_wallets')
        .select('id, wallet_address, wallet_type, net, non_evm_network')
        .eq('wallet_type', 'injective')
        .eq('net', network);

      if (error) {
        console.error('Failed to load wallets:', error);
        return;
      }

      console.log('✅ Loaded Injective wallets:', data);
      setWallets(data || []);
      
      // Auto-select first wallet if available
      if (data && data.length > 0) {
        setSelectedWalletId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading wallets:', error);
    } finally {
      setWalletsLoading(false);
    }
  };

  const loadTokens = async () => {
    setLoading(true);
    setError(null);
    console.log('🔍 [InjectiveTokenManager] Loading tokens...');
    console.log('   Network:', network);
    console.log('   Project ID:', projectId);
    console.log('   Filter by project:', filterByProject);
    
    try {
      // Get auth session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        const errorMsg = 'Please log in to view tokens';
        console.warn('⚠️ [InjectiveTokenManager] No active session - user needs to log in');
        setError(errorMsg);
        setTokens([]);
        setLoading(false);
        return;
      }
      console.log('✅ [InjectiveTokenManager] Active session found');

      // Build API URL
      let url = `http://localhost:3001/api/injective/native/tokens?network=${network}`;
      
      // Add project filter if enabled and projectId exists
      if (filterByProject && projectId) {
        url += `&project_id=${projectId}`;
      }

      console.log('   Fetching from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('   Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ [InjectiveTokenManager] Data received:', data);
        console.log('   Token count:', data.tokens?.length || 0);
        
        if (data.tokens && data.tokens.length > 0) {
          console.log('   📋 Tokens:', data.tokens.map((t: Token) => `${t.symbol} (${t.name})`).join(', '));
        } else {
          console.log('   ⚠️ No tokens found for network:', network);
        }
        
        const tokensWithMTS = await enrichTokensWithMTS(data.tokens || []);
        setTokens(tokensWithMTS);
      } else {
        const errorText = await response.text();
        console.error('❌ [InjectiveTokenManager] API error:', response.status);
        console.error('   Error body:', errorText);
        
        let errorMsg = `API error: ${response.status} ${response.statusText}`;
        if (response.status === 401) {
          errorMsg = 'Authentication failed - please log in again';
          console.log('   → Authentication failed - token may be expired');
        } else if (response.status === 404) {
          errorMsg = 'API endpoint not found - check backend is running';
          console.log('   → API endpoint not found');
        }
        setError(errorMsg);
        setTokens([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to backend';
      console.error('❌ [InjectiveTokenManager] Failed to load tokens:', error);
      console.error('   Error details:', errorMsg);
      console.log('   → Check that backend is running on http://localhost:3001');
      setError(`Connection error: ${errorMsg}`);
      setTokens([]);
    } finally {
      setLoading(false);
      console.log('🏁 [InjectiveTokenManager] Loading complete');
    }
  };

  // Enrich tokens with MTS status
  const enrichTokensWithMTS = async (tokens: Token[]): Promise<Token[]> => {
    const mtsUtils = network === 'mainnet' ? mtsUtilitiesMainnet : mtsUtilitiesTestnet;
    
    const enriched = await Promise.all(
      tokens.map(async (token) => {
        try {
          // Check if token has MTS (would need ERC20 deployed)
          // For TokenFactory tokens, MTS requires registration
          // For now, mark as not MTS-enabled (future feature)
          return {
            ...token,
            mts_enabled: false,
            evm_address: undefined
          };
        } catch {
          return {
            ...token,
            mts_enabled: false,
            evm_address: undefined
          };
        }
      })
    );

    return enriched;
  };

  // Format supply with decimals
  const formatSupply = (supply: string, decimals: number): string => {
    const num = BigInt(supply);
    const divisor = BigInt(10 ** decimals);
    const integerPart = num / divisor;
    const remainder = num % divisor;
    
    if (remainder === BigInt(0)) {
      return integerPart.toString();
    }
    
    const fractionalPart = remainder.toString().padStart(decimals, '0');
    return `${integerPart}.${fractionalPart}`;
  };

  // Calculate human-readable token amount from raw supply (same as deployment component)
  const calculateDisplayAmount = (rawAmount: string, decimals: number): string => {
    if (!rawAmount || rawAmount === '0' || isNaN(Number(rawAmount))) {
      return '0';
    }
    
    try {
      const amount = BigInt(rawAmount);
      const divisor = BigInt(10 ** decimals);
      const integerPart = amount / divisor;
      const remainder = amount % divisor;
      
      if (remainder === BigInt(0)) {
        return integerPart.toLocaleString();
      }
      
      const fractionalPart = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
      return `${integerPart.toLocaleString()}.${fractionalPart}`;
    } catch (error) {
      return '0';
    }
  };

  // Convert human-readable amount to raw base units (same as deployment component)
  const convertToRawAmount = (displayAmount: string, decimals: number): string => {
    if (!displayAmount || displayAmount === '0') {
      return '0';
    }
    
    try {
      // Remove commas and parse
      const cleanAmount = displayAmount.replace(/,/g, '');
      const [integerPart, fractionalPart = ''] = cleanAmount.split('.');
      
      // Pad or truncate fractional part to match decimals
      const paddedFraction = (fractionalPart + '0'.repeat(decimals)).slice(0, decimals);
      
      // Combine and convert to BigInt
      const rawAmount = BigInt(integerPart + paddedFraction);
      return rawAmount.toString();
    } catch (error) {
      return '0';
    }
  };

  // Quick set functions for common amounts
  const setQuickAmount = (tokenAmount: number) => {
    if (!selectedToken) return;
    const rawAmount = convertToRawAmount(tokenAmount.toString(), selectedToken.decimals);
    setActionAmount(rawAmount);
  };

  // Apply custom amount
  const applyCustomAmount = () => {
    if (!selectedToken || !customAmount || customAmount === '0') return;
    const rawAmount = convertToRawAmount(customAmount, selectedToken.decimals);
    setActionAmount(rawAmount);
  };

  // Get display amount for current action
  const getDisplayAmount = (): string => {
    if (!selectedToken || !actionAmount) return '0';
    return calculateDisplayAmount(actionAmount, selectedToken.decimals);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDenom(type);
      setTimeout(() => setCopiedDenom(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get explorer URL
  const getExplorerUrl = (token: Token, type: 'token' | 'tx', hash?: string): string => {
    const baseUrl = token.network === 'mainnet'
      ? 'https://explorer.injective.network'
      : 'https://testnet.explorer.injective.network';
    
    if (type === 'tx' && hash) {
      return `${baseUrl}/transaction/${hash}`;
    }
    return baseUrl;
  };

  // Handle mint
  const handleMint = async () => {
    if (!selectedToken || !selectedWalletId) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActionResult({
          success: false,
          message: 'Please log in to perform this action'
        });
        return;
      }

      const response = await fetch(
        `/api/injective/native/tokens/${encodeURIComponent(selectedToken.denom)}/mint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            amount: actionAmount,
            recipient: actionRecipient || undefined,
            walletId: selectedWalletId
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Record transaction in database
        try {
          await supabase
            .from('injective_native_token_transactions')
            .insert({
              token_id: selectedToken.id,
              denom: selectedToken.denom,
              transaction_type: 'mint',
              to_address: actionRecipient || selectedToken.admin_address,
              amount: actionAmount,
              tx_hash: data.txHash,
              network: selectedToken.network,
              chain_id: selectedToken.network === 'mainnet' ? 'injective-1' : 'injective-888',
              status: 'confirmed',
              wallet_id: selectedWalletId,
              signer_address: selectedToken.admin_address,
              project_id: selectedToken.project_id
            });
        } catch (dbError) {
          console.error('Failed to record transaction in database:', dbError);
          // Don't fail the operation if database recording fails
        }

        setActionResult({
          success: true,
          message: `Minted ${formatSupply(actionAmount, selectedToken.decimals)} tokens`,
          txHash: data.txHash
        });
        loadTokens();
      } else {
        setActionResult({
          success: false,
          message: data.message || 'Minting failed'
        });
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Unexpected error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle burn
  const handleBurn = async () => {
    if (!selectedToken || !selectedWalletId) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActionResult({
          success: false,
          message: 'Please log in to perform this action'
        });
        return;
      }

      const response = await fetch(
        `/api/injective/native/tokens/${encodeURIComponent(selectedToken.denom)}/burn`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            amount: actionAmount,
            walletId: selectedWalletId
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Record transaction in database
        try {
          await supabase
            .from('injective_native_token_transactions')
            .insert({
              token_id: selectedToken.id,
              denom: selectedToken.denom,
              transaction_type: 'burn',
              from_address: selectedToken.admin_address,
              amount: actionAmount,
              tx_hash: data.txHash,
              network: selectedToken.network,
              chain_id: selectedToken.network === 'mainnet' ? 'injective-1' : 'injective-888',
              status: 'confirmed',
              wallet_id: selectedWalletId,
              signer_address: selectedToken.admin_address,
              project_id: selectedToken.project_id
            });
        } catch (dbError) {
          console.error('Failed to record transaction in database:', dbError);
          // Don't fail the operation if database recording fails
        }

        setActionResult({
          success: true,
          message: `Burned ${formatSupply(actionAmount, selectedToken.decimals)} tokens`,
          txHash: data.txHash
        });
        loadTokens();
      } else {
        setActionResult({
          success: false,
          message: data.message || 'Burning failed'
        });
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Unexpected error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Batch recipient management
  const addBatchRecipient = () => {
    setBatchRecipients([...batchRecipients, { address: '', amount: '', displayAmount: '' }]);
  };

  const removeBatchRecipient = (index: number) => {
    if (batchRecipients.length > 1) {
      setBatchRecipients(batchRecipients.filter((_, i) => i !== index));
    }
  };

  const updateBatchRecipient = (index: number, field: 'address' | 'amount', value: string) => {
    const updated = [...batchRecipients];
    if (field === 'amount' && selectedToken) {
      // Store the display amount (what user typed) and convert to raw base units
      updated[index].displayAmount = value;
      updated[index].amount = convertToRawAmount(value, selectedToken.decimals);
    } else {
      updated[index][field] = value;
    }
    setBatchRecipients(updated);
  };

  // Calculate total batch amount
  const calculateTotalBatchAmount = (): string => {
    if (!selectedToken) return '0';
    try {
      const total = batchRecipients.reduce((sum, recipient) => {
        const amount = recipient.amount ? BigInt(recipient.amount) : BigInt(0);
        return sum + amount;
      }, BigInt(0));
      return total.toString();
    } catch {
      return '0';
    }
  };

  // Validate batch recipients
  const validateBatchRecipients = (): boolean => {
    if (batchRecipients.length === 0) return false;
    return batchRecipients.every(r => {
      // For batch mint: address is required
      // For batch burn: address is optional (tracking only)
      const addressValid = actionType === 'batch-burn' || (r.address && r.address.length > 0);
      // Display amount must be entered and result in a valid amount > 0
      const amountValid = r.displayAmount && r.displayAmount !== '0' && r.amount && Number(r.amount) > 0;
      return addressValid && amountValid;
    });
  };

  // Handle batch mint
  const handleBatchMint = async () => {
    if (!selectedToken || !selectedWalletId || !validateBatchRecipients()) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActionResult({
          success: false,
          message: 'Please log in to perform this action'
        });
        return;
      }

      // Execute batch mint operations sequentially
      const results = [];
      let successCount = 0;
      let failCount = 0;
      const batchId = crypto.randomUUID();

      for (let i = 0; i < batchRecipients.length; i++) {
        const recipient = batchRecipients[i];
        try {
          const response = await fetch(
            `/api/injective/native/tokens/${encodeURIComponent(selectedToken.denom)}/mint`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                amount: recipient.amount,
                recipient: recipient.address,
                walletId: selectedWalletId
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            // Record transaction in database
            try {
              await supabase
                .from('injective_native_token_transactions')
                .insert({
                  token_id: selectedToken.id,
                  denom: selectedToken.denom,
                  transaction_type: 'batch_mint',
                  to_address: recipient.address,
                  amount: recipient.amount,
                  tx_hash: data.txHash,
                  network: selectedToken.network,
                  chain_id: selectedToken.network === 'mainnet' ? 'injective-1' : 'injective-888',
                  status: 'confirmed',
                  wallet_id: selectedWalletId,
                  signer_address: selectedToken.admin_address,
                  project_id: selectedToken.project_id,
                  batch_id: batchId,
                  batch_index: i,
                  batch_total: batchRecipients.length
                });
            } catch (dbError) {
              console.error('Failed to record batch mint transaction:', dbError);
            }

            results.push({ 
              address: recipient.address, 
              amount: recipient.amount, 
              success: true, 
              txHash: data.txHash 
            });
            successCount++;
          } else {
            results.push({ 
              address: recipient.address, 
              amount: recipient.amount, 
              success: false, 
              error: data.message 
            });
            failCount++;
          }
        } catch (error: any) {
          results.push({ 
            address: recipient.address, 
            amount: recipient.amount, 
            success: false, 
            error: error.message 
          });
          failCount++;
        }
      }

      // Show results
      const totalAmount = calculateTotalBatchAmount();
      const displayTotal = calculateDisplayAmount(totalAmount, selectedToken.decimals);
      
      setActionResult({
        success: successCount > 0,
        message: `Batch mint completed: ${successCount} successful, ${failCount} failed. Total minted: ${displayTotal} ${selectedToken.symbol}`,
        txHash: results.find(r => r.success)?.txHash
      });

      if (successCount > 0) {
        loadTokens();
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Batch mint failed'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle batch burn
  const handleBatchBurn = async () => {
    if (!selectedToken || !selectedWalletId || !validateBatchRecipients()) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setActionResult({
          success: false,
          message: 'Please log in to perform this action'
        });
        return;
      }

      // Execute batch burn operations sequentially
      const results = [];
      let successCount = 0;
      let failCount = 0;
      const batchId = crypto.randomUUID();

      for (let i = 0; i < batchRecipients.length; i++) {
        const recipient = batchRecipients[i];
        try {
          const response = await fetch(
            `/api/injective/native/tokens/${encodeURIComponent(selectedToken.denom)}/burn`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                amount: recipient.amount,
                walletId: selectedWalletId
              })
            }
          );

          const data = await response.json();

          if (response.ok) {
            // Record transaction in database
            try {
              await supabase
                .from('injective_native_token_transactions')
                .insert({
                  token_id: selectedToken.id,
                  denom: selectedToken.denom,
                  transaction_type: 'batch_burn',
                  from_address: selectedToken.admin_address,
                  amount: recipient.amount,
                  tx_hash: data.txHash,
                  network: selectedToken.network,
                  chain_id: selectedToken.network === 'mainnet' ? 'injective-1' : 'injective-888',
                  status: 'confirmed',
                  wallet_id: selectedWalletId,
                  signer_address: selectedToken.admin_address,
                  project_id: selectedToken.project_id,
                  batch_id: batchId,
                  batch_index: i,
                  batch_total: batchRecipients.length
                });
            } catch (dbError) {
              console.error('Failed to record batch burn transaction:', dbError);
            }

            results.push({ 
              address: recipient.address, 
              amount: recipient.amount, 
              success: true, 
              txHash: data.txHash 
            });
            successCount++;
          } else {
            results.push({ 
              address: recipient.address, 
              amount: recipient.amount, 
              success: false, 
              error: data.message 
            });
            failCount++;
          }
        } catch (error: any) {
          results.push({ 
            address: recipient.address, 
            amount: recipient.amount, 
            success: false, 
            error: error.message 
          });
          failCount++;
        }
      }

      // Show results
      const totalAmount = calculateTotalBatchAmount();
      const displayTotal = calculateDisplayAmount(totalAmount, selectedToken.decimals);
      
      setActionResult({
        success: successCount > 0,
        message: `Batch burn completed: ${successCount} successful, ${failCount} failed. Total burned: ${displayTotal} ${selectedToken.symbol}`,
        txHash: results.find(r => r.success)?.txHash
      });

      if (successCount > 0) {
        loadTokens();
      }
    } catch (error: any) {
      setActionResult({
        success: false,
        message: error.message || 'Batch burn failed'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open action dialog
  const openAction = (token: Token, type: 'mint' | 'burn' | 'metadata' | 'market' | 'mts' | 'batch-mint' | 'batch-burn') => {
    setSelectedToken(token);
    setActionType(type);
    setActionAmount('');
    setActionRecipient('');
    setActionResult(null);
    setCustomAmount('');
    
    // Reset batch recipients
    if (type === 'batch-mint' || type === 'batch-burn') {
      setBatchRecipients([{ address: '', amount: '', displayAmount: '' }]);
    }
    
    // Load wallets for mint/burn actions
    if (type === 'mint' || type === 'burn' || type === 'batch-mint' || type === 'batch-burn') {
      loadWallets();
    }
  };

  // Close action dialog
  const closeAction = () => {
    setSelectedToken(null);
    setActionType(null);
    setActionAmount('');
    setActionRecipient('');
    setActionResult(null);
    setCustomAmount('');
    setBatchRecipients([{ address: '', amount: '', displayAmount: '' }]);
  };

  const getFilteredTokensCount = () => {
    return tokens.length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Injective Token Manager
                {projectId && filterByProject && (
                  <Badge variant="secondary" className="ml-2">
                    <Filter className="h-3 w-3 mr-1" />
                    Project Scope
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your Injective Native TokenFactory tokens with MTS support
                {projectId && filterByProject && (
                  <span className="block mt-1 text-xs">
                    Showing {getFilteredTokensCount()} token{getFilteredTokensCount() !== 1 ? 's' : ''} for this project
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showProjectFilter && projectId && (
                <Button
                  variant={filterByProject ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterByProject(!filterByProject)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {filterByProject ? 'Project Only' : 'All Tokens'}
                </Button>
              )}
              <Select value={network} onValueChange={(value: 'testnet' | 'mainnet') => setNetwork(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="testnet">Testnet</SelectItem>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={loadTokens}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Alert variant={error === 'Please log in to view tokens' ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {error === 'Please log in to view tokens' ? 'Authentication Required' : 'Error Loading Tokens'}
              </AlertTitle>
              <AlertDescription>
                {error}
                <div className="mt-3 flex gap-2">
                  {error !== 'Please log in to view tokens' && (
                    <Button variant="outline" size="sm" onClick={loadTokens}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  {import.meta.env.DEV && error !== 'Please log in to view tokens' && (
                    <Button variant="outline" size="sm" onClick={async () => {
                      const { data: { session } } = await supabase.auth.getSession();
                      console.log('📊 Debug Info:');
                      console.log('   Supabase Session:', session ? 'Active' : 'No session');
                      console.log('   Network:', network);
                      console.log('   Backend URL: http://localhost:3001');
                      console.log('   Project ID:', projectId);
                      console.log('   Filter by project:', filterByProject);
                    }}>
                      Show Debug Info
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          ) : tokens.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {filterByProject && projectId 
                  ? 'No tokens found for this project on ' + network
                  : 'No tokens found on ' + network
                }
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first token using the Deploy page
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Addresses</TableHead>
                  <TableHead className="text-right">Total Supply</TableHead>
                  <TableHead className="text-right">Circulating</TableHead>
                  <TableHead>MTS</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{token.symbol}</div>
                        <div className="text-sm text-muted-foreground">{token.name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {/* Native Denom */}
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs font-mono">
                            Native
                          </Badge>
                          <code className="text-xs truncate max-w-[200px]">
                            {token.subdenom}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={() => copyToClipboard(token.denom, `native-${token.id}`)}
                          >
                            {copiedDenom === `native-${token.id}` ? (
                              <CheckCircle2 className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* EVM Address (if MTS) */}
                        {token.mts_enabled && token.evm_address && (
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              EVM
                            </Badge>
                            <code className="text-xs truncate max-w-[200px]">
                              {token.evm_address.slice(0, 10)}...
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => copyToClipboard(token.evm_address!, `evm-${token.id}`)}
                            >
                              {copiedDenom === `evm-${token.id}` ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatSupply(token.total_supply, token.decimals)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatSupply(token.circulating_supply, token.decimals)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={token.mts_enabled ? 'default' : 'outline'}
                        className={cn(
                          token.mts_enabled && 'bg-green-600'
                        )}
                      >
                        {token.mts_enabled ? '✓ Enabled' : 'Native Only'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={token.status === 'active' ? 'default' : 'outline'}>
                        {token.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'mint')}
                          title="Mint tokens"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'burn')}
                          title="Burn tokens"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'batch-mint')}
                          title="Batch mint to multiple addresses"
                        >
                          <Plus className="h-3 w-3" />
                          <Plus className="h-3 w-3 -ml-1" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'batch-burn')}
                          title="Batch burn from multiple addresses"
                        >
                          <Minus className="h-3 w-3" />
                          <Minus className="h-3 w-3 -ml-1" />
                        </Button>
                        {token.mts_enabled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openAction(token, 'mts')}
                            title="MTS Transfer"
                          >
                            <ArrowLeftRight className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAction(token, 'market')}
                          title="Launch market"
                        >
                          <TrendingUp className="h-4 w-4" />
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

      {/* Action Dialog */}
      <Dialog open={actionType !== null} onOpenChange={() => closeAction()}>
        <DialogContent className="w-[80%] max-w-[80%]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'mint' && 'Mint Tokens'}
              {actionType === 'burn' && 'Burn Tokens'}
              {actionType === 'batch-mint' && 'Batch Mint Tokens'}
              {actionType === 'batch-burn' && 'Batch Burn Tokens'}
              {actionType === 'metadata' && 'Update Metadata'}
              {actionType === 'market' && 'Launch Market'}
              {actionType === 'mts' && 'MTS Cross-VM Transfer'}
            </DialogTitle>
            <DialogDescription>
              {selectedToken?.symbol} ({selectedToken?.name})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {actionType === 'mint' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Signing Wallet</Label>
                  {walletsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading wallets...</span>
                    </div>
                  ) : wallets.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Injective wallets found for {network}. Please create a wallet first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.wallet_address.substring(0, 12)}...{wallet.wallet_address.slice(-8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Must be token admin wallet: {selectedToken?.admin_address?.substring(0, 12)}...
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Mint</Label>
                  <Input
                    id="amount"
                    type="text"
                    placeholder={`Raw amount in base units with ${selectedToken?.decimals} decimals`}
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Enter amount in base units (raw amount including decimals)
                      </p>
                    </div>
                  </div>

                  {/* Real-time preview of token amount */}
                  {actionAmount && actionAmount !== '0' && !isNaN(Number(actionAmount)) && (
                    <Alert className="mt-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-blue-900 dark:text-blue-100">
                        Token Amount Preview
                      </AlertTitle>
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {getDisplayAmount()}
                            </span>
                            <span className="text-sm font-medium">
                              {selectedToken?.symbol || 'tokens'}
                            </span>
                          </div>
                          <div className="text-xs">
                            Raw amount: {Number(actionAmount).toLocaleString()} base units
                          </div>
                          <div className="text-xs">
                            Calculation: {Number(actionAmount).toLocaleString()} ÷ 10^{selectedToken?.decimals} = {getDisplayAmount()}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Custom amount input */}
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Number of Tokens:</p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter custom token number (e.g., 5000 or 2.5)"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={applyCustomAmount}
                        disabled={!customAmount || customAmount === '0'}
                        className="text-xs whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  {/* Quick set buttons for common amounts */}
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick Set Common Amounts:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000)}
                        className="text-xs"
                      >
                        1K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(10000)}
                        className="text-xs"
                      >
                        10K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(100000)}
                        className="text-xs"
                      >
                        100K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000000)}
                        className="text-xs"
                      >
                        1M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(10000000)}
                        className="text-xs"
                      >
                        10M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(100000000)}
                        className="text-xs"
                      >
                        100M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000000000)}
                        className="text-xs"
                      >
                        1B
                      </Button>
                    </div>
                  </div>

                  {/* Helpful examples */}
                  {selectedToken && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-2">Common amounts (with {selectedToken.decimals} decimals):</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-mono">100{Array(selectedToken.decimals).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 100 tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 3).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 1,000 tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 6).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 1M tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 8).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 100M tokens</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient (Optional)</Label>
                  <Input
                    id="recipient"
                    placeholder="inj1... (defaults to admin)"
                    value={actionRecipient}
                    onChange={(e) => setActionRecipient(e.target.value)}
                  />
                </div>
              </>
            )}

            {actionType === 'burn' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Signing Wallet</Label>
                  {walletsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading wallets...</span>
                    </div>
                  ) : wallets.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Injective wallets found for {network}. Please create a wallet first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.wallet_address.substring(0, 12)}...{wallet.wallet_address.slice(-8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Must be token admin wallet: {selectedToken?.admin_address?.substring(0, 12)}...
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Burn</Label>
                  <Input
                    id="amount"
                    type="text"
                    placeholder={`Raw amount in base units with ${selectedToken?.decimals} decimals`}
                    value={actionAmount}
                    onChange={(e) => setActionAmount(e.target.value)}
                  />
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        Enter amount in base units (raw amount including decimals)
                      </p>
                    </div>
                  </div>

                  {/* Real-time preview of token amount */}
                  {actionAmount && actionAmount !== '0' && !isNaN(Number(actionAmount)) && (
                    <Alert className="mt-2 bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                      <Minus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertTitle className="text-orange-900 dark:text-orange-100">
                        Burn Amount Preview
                      </AlertTitle>
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {getDisplayAmount()}
                            </span>
                            <span className="text-sm font-medium">
                              {selectedToken?.symbol || 'tokens'}
                            </span>
                          </div>
                          <div className="text-xs">
                            Raw amount: {Number(actionAmount).toLocaleString()} base units
                          </div>
                          <div className="text-xs">
                            Calculation: {Number(actionAmount).toLocaleString()} ÷ 10^{selectedToken?.decimals} = {getDisplayAmount()}
                          </div>
                          <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 mt-2">
                            ⚠️ This action is permanent and cannot be undone
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Custom amount input */}
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Number of Tokens:</p>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Enter custom token number (e.g., 5000 or 2.5)"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={applyCustomAmount}
                        disabled={!customAmount || customAmount === '0'}
                        className="text-xs whitespace-nowrap"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>

                  {/* Quick set buttons for common amounts */}
                  <div className="mt-2 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Quick Set Common Amounts:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000)}
                        className="text-xs"
                      >
                        1K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(10000)}
                        className="text-xs"
                      >
                        10K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(100000)}
                        className="text-xs"
                      >
                        100K
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000000)}
                        className="text-xs"
                      >
                        1M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(10000000)}
                        className="text-xs"
                      >
                        10M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(100000000)}
                        className="text-xs"
                      >
                        100M
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickAmount(1000000000)}
                        className="text-xs"
                      >
                        1B
                      </Button>
                    </div>
                  </div>

                  {/* Helpful examples */}
                  {selectedToken && (
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <p className="text-xs font-medium mb-2">Common amounts (with {selectedToken.decimals} decimals):</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-mono">100{Array(selectedToken.decimals).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 100 tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 3).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 1,000 tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 6).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 1M tokens</span>
                        </div>
                        <div>
                          <span className="font-mono">1{Array(selectedToken.decimals + 8).fill('0').join('')}</span>
                          <span className="text-muted-foreground ml-1">= 100M tokens</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {actionType === 'batch-mint' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Signing Wallet</Label>
                  {walletsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading wallets...</span>
                    </div>
                  ) : wallets.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Injective wallets found for {network}. Please create a wallet first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.wallet_address.substring(0, 12)}...{wallet.wallet_address.slice(-8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Must be token admin wallet: {selectedToken?.admin_address?.substring(0, 12)}...
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Batch Recipients</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBatchRecipient}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {batchRecipients.map((recipient, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label htmlFor={`address-${index}`} className="text-xs">
                              Recipient Address
                            </Label>
                            <Input
                              id={`address-${index}`}
                              placeholder="inj1..."
                              value={recipient.address}
                              onChange={(e) => updateBatchRecipient(index, 'address', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`amount-${index}`} className="text-xs">
                              Number of Tokens
                            </Label>
                            <Input
                              id={`amount-${index}`}
                              type="text"
                              placeholder="1000 or 2.5 or 10000"
                              value={recipient.displayAmount}
                              onChange={(e) => updateBatchRecipient(index, 'amount', e.target.value)}
                            />
                            {recipient.displayAmount && recipient.displayAmount !== '0' && selectedToken && recipient.amount !== '0' && (
                              <div className="space-y-1 mt-1">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                  = {recipient.displayAmount} {selectedToken.symbol}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Raw: {Number(recipient.amount).toLocaleString()} base units
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBatchRecipient(index)}
                          disabled={batchRecipients.length === 1}
                          className="mt-6"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {selectedToken && calculateTotalBatchAmount() !== '0' && (
                    <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <AlertTitle className="text-blue-900 dark:text-blue-100">
                        Total Batch Mint Amount
                      </AlertTitle>
                      <AlertDescription className="text-blue-800 dark:text-blue-200">
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {calculateDisplayAmount(calculateTotalBatchAmount(), selectedToken.decimals)}
                            </span>
                            <span className="text-sm font-medium">
                              {selectedToken.symbol}
                            </span>
                          </div>
                          <div className="text-xs">
                            Minting to {batchRecipients.length} recipient{batchRecipients.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {actionType === 'batch-burn' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="wallet">Signing Wallet</Label>
                  {walletsLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading wallets...</span>
                    </div>
                  ) : wallets.length === 0 ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Injective wallets found for {network}. Please create a wallet first.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select wallet" />
                      </SelectTrigger>
                      <SelectContent>
                        {wallets.map((wallet) => (
                          <SelectItem key={wallet.id} value={wallet.id}>
                            {wallet.wallet_address.substring(0, 12)}...{wallet.wallet_address.slice(-8)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Must be token admin wallet: {selectedToken?.admin_address?.substring(0, 12)}...
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Batch Burn Operations</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addBatchRecipient}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Burn Operation
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {batchRecipients.map((recipient, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label htmlFor={`burn-address-${index}`} className="text-xs">
                              From Address (for tracking - optional)
                            </Label>
                            <Input
                              id={`burn-address-${index}`}
                              placeholder="inj1... (optional, for your reference)"
                              value={recipient.address}
                              onChange={(e) => updateBatchRecipient(index, 'address', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`burn-amount-${index}`} className="text-xs">
                              Number of Tokens to Burn
                            </Label>
                            <Input
                              id={`burn-amount-${index}`}
                              type="text"
                              placeholder="1000 or 2.5 or 10000"
                              value={recipient.displayAmount}
                              onChange={(e) => updateBatchRecipient(index, 'amount', e.target.value)}
                            />
                            {recipient.displayAmount && recipient.displayAmount !== '0' && selectedToken && recipient.amount !== '0' && (
                              <div className="space-y-1 mt-1">
                                <p className="text-xs font-medium text-orange-700 dark:text-orange-300">
                                  = {recipient.displayAmount} {selectedToken.symbol}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Raw: {Number(recipient.amount).toLocaleString()} base units
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBatchRecipient(index)}
                          disabled={batchRecipients.length === 1}
                          className="mt-6"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {selectedToken && calculateTotalBatchAmount() !== '0' && (
                    <Alert className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
                      <Minus className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <AlertTitle className="text-orange-900 dark:text-orange-100">
                        Total Batch Burn Amount
                      </AlertTitle>
                      <AlertDescription className="text-orange-800 dark:text-orange-200">
                        <div className="mt-2 space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {calculateDisplayAmount(calculateTotalBatchAmount(), selectedToken.decimals)}
                            </span>
                            <span className="text-sm font-medium">
                              {selectedToken.symbol}
                            </span>
                          </div>
                          <div className="text-xs">
                            Burning from {batchRecipients.length} operation{batchRecipients.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs font-semibold text-orange-700 dark:text-orange-300 mt-2">
                            ⚠️ These operations are permanent and cannot be undone
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {actionType === 'market' && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertTitle>Launch on DEX</AlertTitle>
                <AlertDescription>
                  Use the "Launch Market" page to create a spot market for this token on Injective DEX.
                </AlertDescription>
              </Alert>
            )}

            {actionType === 'mts' && (
              <Alert>
                <ArrowLeftRight className="h-4 w-4" />
                <AlertTitle>MTS Transfer</AlertTitle>
                <AlertDescription>
                  Use the "MTS Transfer" page to transfer tokens between Native and EVM environments.
                </AlertDescription>
              </Alert>
            )}

            {actionResult && (
              <Alert variant={actionResult.success ? 'default' : 'destructive'}>
                <AlertTitle>{actionResult.success ? 'Success!' : 'Error'}</AlertTitle>
                <AlertDescription>
                  {actionResult.message}
                  {actionResult.txHash && (
                    <div className="mt-2">
                      <a
                        href={getExplorerUrl(selectedToken!, 'tx', actionResult.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center text-sm"
                      >
                        View Transaction <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeAction}>
              Close
            </Button>
            {actionType === 'mint' && (
              <Button
                onClick={handleMint}
                disabled={actionLoading || !actionAmount || !selectedWalletId || wallets.length === 0}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting...
                  </>
                ) : (
                  'Mint Tokens'
                )}
              </Button>
            )}
            {actionType === 'burn' && (
              <Button
                onClick={handleBurn}
                disabled={actionLoading || !actionAmount || !selectedWalletId || wallets.length === 0}
                variant="destructive"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Burning...
                  </>
                ) : (
                  'Burn Tokens'
                )}
              </Button>
            )}
            {actionType === 'batch-mint' && (
              <Button
                onClick={handleBatchMint}
                disabled={actionLoading || !validateBatchRecipients() || !selectedWalletId || wallets.length === 0}
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Batch...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Mint to {batchRecipients.length} Recipients
                  </>
                )}
              </Button>
            )}
            {actionType === 'batch-burn' && (
              <Button
                onClick={handleBatchBurn}
                disabled={actionLoading || !validateBatchRecipients() || !selectedWalletId || wallets.length === 0}
                variant="destructive"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Batch...
                  </>
                ) : (
                  <>
                    <Minus className="mr-2 h-4 w-4" />
                    Burn {batchRecipients.length} Operations
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InjectiveTokenManager;
