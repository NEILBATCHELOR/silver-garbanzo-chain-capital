/**
 * Bulk Mint Form Component
 * Allows batch minting of ERC-20 tokens to multiple addresses
 * ENHANCED: Now includes execution logic with nonce management
 * Pattern: Exact match with BatchTransferForm.tsx for consistency
 */

import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
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
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  Zap,
} from 'lucide-react';

// Import services (CRITICAL: TokenMintingService + NonceManager)
import { tokenMintingService } from '@/services/wallet/TokenMintingService';
import { nonceManager } from '@/services/wallet/NonceManager';
import { rpcManager } from '@/infrastructure/web3/rpc/RPCConnectionManager';
import type { AllWallets } from '@/services/wallet/InternalWalletService';

// Batch Mint Entry
export interface BulkMintEntry {
  id: string;
  toAddress: string;
  amount: string;
  status: 'pending' | 'validating' | 'processing' | 'success' | 'error' | 'skipped';
  transactionHash?: string;
  nonce?: number; // CRITICAL: Store nonce for diagnostics
  error?: string;
}

interface BulkMintFormProps {
  tokenContractAddress: string; // ERC-20 token contract to mint from
  tokenDecimals?: number; // Token decimals (default: 18)
  tokenSymbol?: string; // Token symbol for display
  wallets: Array<{ // Available wallets that can mint
    id: string;
    address: string;
    name: string;
    type: 'project' | 'user';
    chainId?: number;
    blockchain?: string;
  }>;
  onComplete?: (results: BulkMintEntry[]) => void;
  onCancel?: () => void;
}

export const BulkMintForm: React.FC<BulkMintFormProps> = ({
  tokenContractAddress,
  tokenDecimals = 18,
  tokenSymbol = 'TOKEN',
  wallets,
  onComplete,
  onCancel,
}) => {
  const { toast } = useToast();
  
  // Entries state
  const [entries, setEntries] = useState<BulkMintEntry[]>([]);
  const [showUploadHint, setShowUploadHint] = useState(true);
  
  // Execution state (PATTERN: Match BatchTransferForm)
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');

  /**
   * Parse CSV file and extract addresses and amounts
   */
  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());

          // Skip header if present
          const dataLines = lines[0].toLowerCase().includes('address')
            ? lines.slice(1)
            : lines;

          const newEntries: BulkMintEntry[] = [];

          dataLines.forEach((line, index) => {
            const [address, amount] = line.split(',').map((s) => s.trim());

            if (address && amount) {
              // Basic validation
              const isValidAddress = ethers.isAddress(address);
              const isValidAmount = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

              newEntries.push({
                id: `entry-${Date.now()}-${index}`,
                toAddress: address,
                amount: amount,
                status: isValidAddress && isValidAmount ? 'pending' : 'error',
                error:
                  !isValidAddress
                    ? 'Invalid address'
                    : !isValidAmount
                    ? 'Invalid amount'
                    : undefined,
              });
            }
          });

          setEntries(newEntries);
          setShowUploadHint(false);

          const validCount = newEntries.filter((e) => e.status === 'pending').length;
          const invalidCount = newEntries.length - validCount;

          toast({
            title: 'File Uploaded',
            description: `Loaded ${validCount} valid entries${
              invalidCount > 0 ? `, ${invalidCount} invalid` : ''
            }`,
          });
        } catch (error) {
          console.error('CSV parsing error:', error);
          toast({
            variant: 'destructive',
            title: 'Upload Failed',
            description: 'Failed to parse CSV file. Please check the format.',
          });
        }
      };

      reader.readAsText(file);
    },
    [toast]
  );

  /**
   * Download CSV template
   */
  const downloadTemplate = () => {
    const template =
      'address,amount\n' +
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,100\n' +
      '0x1234567890123456789012345678901234567890,50';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-mint-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Add manual entry
   */
  const addManualEntry = () => {
    const newEntry: BulkMintEntry = {
      id: `entry-${Date.now()}`,
      toAddress: '',
      amount: '',
      status: 'pending',
    };
    const updated = [...entries, newEntry];
    setEntries(updated);
    setShowUploadHint(false);
  };

  /**
   * Update entry
   */
  const updateEntry = (id: string, field: 'toAddress' | 'amount', value: string) => {
    const updated = entries.map((entry) => {
      if (entry.id === id) {
        const updated = { ...entry, [field]: value };

        // Validate
        const isValidAddress = ethers.isAddress(updated.toAddress);
        const isValidAmount =
          !isNaN(parseFloat(updated.amount)) && parseFloat(updated.amount) > 0;

        updated.status =
          isValidAddress && isValidAmount && updated.toAddress && updated.amount
            ? 'pending'
            : 'error';
        updated.error =
          !isValidAddress && updated.toAddress
            ? 'Invalid address'
            : !isValidAmount && updated.amount
            ? 'Invalid amount'
            : undefined;

        return updated;
      }
      return entry;
    });
    setEntries(updated);
  };

  /**
   * Remove entry
   */
  const removeEntry = (id: string) => {
    const updated = entries.filter((entry) => entry.id !== id);
    setEntries(updated);
  };

  /**
   * Clear all entries
   */
  const clearAll = () => {
    setEntries([]);
    setShowUploadHint(true);
  };

  /**
   * Execute batch mints sequentially with nonce management
   * CRITICAL: EXACT PATTERN from BatchTransferForm.tsx
   */
  const executeBatchMints = async () => {
    const wallet = wallets.find((w) => w.id === selectedWalletId);
    if (!wallet || !wallet.chainId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a valid wallet with chain ID',
      });
      return;
    }

    setIsProcessing(true);

    const validEntries = entries.filter((e) => e.status === 'pending');
    const results: BulkMintEntry[] = [];

    try {
      // Get provider for nonce check
      const rpcConfig = rpcManager.getProviderConfig(
        wallet.blockchain as any,
        'testnet'
      );

      if (!rpcConfig) {
        throw new Error(`No RPC configuration for ${wallet.blockchain}`);
      }

      const provider = new ethers.JsonRpcProvider(rpcConfig.url);

      // CRITICAL: Check for nonce gaps before starting (PATTERN: BatchTransferForm)
      console.log('🔍 Checking nonce status before batch mint...');
      const nonceStatus = await nonceManager.getNonceStatus(wallet.address, provider);

      if (nonceStatus.hasGap) {
        const shouldContinue = window.confirm(
          `⚠️ NONCE GAP DETECTED!\n\n` +
            `There are ${nonceStatus.gapSize} pending transaction(s) blocking the queue.\n` +
            `Starting batch mints now may cause failures.\n\n` +
            `Recommended: Cancel stuck transactions first.\n\n` +
            `Do you want to continue anyway?`
        );

        if (!shouldContinue) {
          setIsProcessing(false);
          return;
        }
      } else {
        console.log('✅ No nonce gaps detected. Safe to proceed.');
      }

      // Process each entry sequentially (CRITICAL: NO Promise.all)
      for (let i = 0; i < validEntries.length; i++) {
        const entry = validEntries[i];
        setCurrentIndex(i);

        // Update status to processing
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: 'processing' } : e))
        );

        try {
          console.log(`\n🪙 Minting ${i + 1}/${validEntries.length}: ${entry.amount} ${tokenSymbol} to ${entry.toAddress}`);

          // Execute mint with automatic nonce management
          const result = await tokenMintingService.executeMint({
            contractAddress: tokenContractAddress,
            toAddress: entry.toAddress,
            amount: entry.amount,
            decimals: tokenDecimals,
            chainId: wallet.chainId,
            walletId: wallet.id,
            walletType: wallet.type,
          });

          if (result.success && result.transactionHash) {
            // Update with success
            setEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id
                  ? {
                      ...e,
                      status: 'success',
                      transactionHash: result.transactionHash,
                      nonce: result.diagnostics?.nonce, // CRITICAL: Store nonce
                    }
                  : e
              )
            );

            results.push({
              ...entry,
              status: 'success',
              transactionHash: result.transactionHash,
              nonce: result.diagnostics?.nonce,
            });

            toast({
              title: `Mint ${i + 1}/${validEntries.length} Successful`,
              description: `Minted ${entry.amount} ${tokenSymbol} to ${
                entry.toAddress.slice(0, 6)
              }...${entry.toAddress.slice(-4)}`,
            });
          } else {
            throw new Error(result.error || 'Mint failed');
          }

          // CRITICAL: 1-second delay between transactions (prevents rate limiting + nonce issues)
          if (i < validEntries.length - 1) {
            console.log('⏳ Waiting 1 second before next mint...');
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`❌ Mint failed for entry ${entry.id}:`, error);

          // Update with error
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Mint failed',
                  }
                : e
            )
          );

          results.push({
            ...entry,
            status: 'error',
            error: error instanceof Error ? error.message : 'Mint failed',
          });

          // Ask user if they want to continue
          const shouldContinue = window.confirm(
            `❌ Mint ${i + 1} failed: ${
              error instanceof Error ? error.message : 'Unknown error'
            }\n\nDo you want to continue with remaining mints?`
          );

          if (!shouldContinue) {
            // Skip remaining entries
            for (let j = i + 1; j < validEntries.length; j++) {
              const skippedEntry = validEntries[j];
              setEntries((prev) =>
                prev.map((e) => (e.id === skippedEntry.id ? { ...e, status: 'skipped' } : e))
              );
              results.push({
                ...skippedEntry,
                status: 'skipped',
              });
            }
            break;
          }
        }
      }

      const successCount = results.filter((r) => r.status === 'success').length;
      const errorCount = results.filter((r) => r.status === 'error').length;
      const skippedCount = results.filter((r) => r.status === 'skipped').length;

      toast({
        title: 'Batch Mint Complete',
        description: `✅ ${successCount} successful, ❌ ${errorCount} failed${
          skippedCount > 0 ? `, ⏭️ ${skippedCount} skipped` : ''
        }`,
      });

      onComplete?.(results);
    } catch (error) {
      console.error('Batch mint error:', error);
      toast({
        variant: 'destructive',
        title: 'Batch Mint Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsProcessing(false);
      setCurrentIndex(0);
    }
  };

  // Calculate statistics
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const processingCount = entries.filter((e) => e.status === 'processing').length;
  const successCount = entries.filter((e) => e.status === 'success').length;
  const errorCount = entries.filter((e) => e.status === 'error').length;
  const skippedCount = entries.filter((e) => e.status === 'skipped').length;
  const totalAmount = entries
    .filter((e) => e.status !== 'error' && e.amount)
    .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  const canExecute = pendingCount > 0 && selectedWalletId && !isProcessing;

  return (
    <div className="space-y-4">
      {/* Wallet Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Minter Wallet</CardTitle>
          <CardDescription>Select wallet with minting permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Wallet</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
              disabled={isProcessing}
            >
              <option value="">Select wallet...</option>
              {wallets.map((wallet) => (
                <option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({wallet.address.slice(0, 6)}...{wallet.address.slice(-4)})
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Mint Recipients</CardTitle>
          <CardDescription>Upload a CSV file or add recipients manually</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
                disabled={isProcessing}
              />
            </div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="w-full"
              disabled={isProcessing}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            CSV format: address,amount (one recipient per line)
          </p>

          <Button
            variant="outline"
            onClick={addManualEntry}
            className="w-full"
            disabled={isProcessing}
          >
            + Add Manual Entry
          </Button>
        </CardContent>
      </Card>

      {/* Entries Table */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mint Entries ({entries.length})</CardTitle>
                <CardDescription>
                  Total Amount: {totalAmount.toLocaleString()} {tokenSymbol}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isProcessing && (
                  <Button variant="outline" size="sm" onClick={clearAll}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Statistics */}
            <div className="mb-4 flex flex-wrap gap-4 text-sm">
              {pendingCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Pending: {pendingCount}</span>
                </div>
              )}
              {processingCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                  <span>Processing: {processingCount}</span>
                </div>
              )}
              {successCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Success: {successCount}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Error: {errorCount}</span>
                </div>
              )}
              {skippedCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-gray-500" />
                  <span>Skipped: {skippedCount}</span>
                </div>
              )}
            </div>

            {/* Progress Indicator */}
            {isProcessing && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    Processing mint {currentIndex + 1} of {pendingCount}
                  </span>
                  <span>{Math.round(((currentIndex + 1) / pendingCount) * 100)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / pendingCount) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Entries Table */}
            <div className="max-h-96 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="w-32">Amount</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead className="w-12">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry, index) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{index + 1}</TableCell>
                      <TableCell>
                        {entry.status === 'pending' ? (
                          <Input
                            value={entry.toAddress}
                            onChange={(e) => updateEntry(entry.id, 'toAddress', e.target.value)}
                            placeholder="0x..."
                            className="h-8 font-mono text-xs"
                            disabled={isProcessing}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {entry.toAddress.slice(0, 6)}...{entry.toAddress.slice(-4)}
                            </span>
                            {entry.transactionHash && (
                              <a
                                href={`https://etherscan.io/tx/${entry.transactionHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-blue-500 hover:underline"
                              >
                                View TX
                              </a>
                            )}
                          </div>
                        )}
                        {entry.error && <p className="text-xs text-red-500">{entry.error}</p>}
                      </TableCell>
                      <TableCell>
                        {entry.status === 'pending' ? (
                          <Input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => updateEntry(entry.id, 'amount', e.target.value)}
                            placeholder="0"
                            className="h-8 text-xs"
                            step="1"
                            disabled={isProcessing}
                          />
                        ) : (
                          <span className="text-xs">{entry.amount}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === 'success'
                              ? 'default'
                              : entry.status === 'error'
                              ? 'destructive'
                              : entry.status === 'processing'
                              ? 'secondary'
                              : entry.status === 'skipped'
                              ? 'outline'
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {entry.status === 'processing' && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {entry.status === 'success' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {entry.status === 'error' && <XCircle className="mr-1 h-3 w-3" />}
                          {entry.status}
                        </Badge>
                        {entry.nonce !== undefined && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (n:{entry.nonce})
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.status === 'pending' && !isProcessing && (
                          <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={executeBatchMints} disabled={!canExecute}>
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Minting {currentIndex + 1}/{pendingCount}...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Execute Batch Mint ({pendingCount} entries)
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Nonce Gap Warning */}
      {!isProcessing && pendingCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Batch Mint Process:</strong> Mints will be executed sequentially with 1-second
            delays between transactions. The system will automatically check for nonce gaps before
            starting to prevent transaction failures.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default BulkMintForm;
