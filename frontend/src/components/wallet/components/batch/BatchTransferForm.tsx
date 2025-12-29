import React, { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Play,
  Pause,
  SkipForward,
  Wallet as WalletIcon,
  Building2,
  User as UserIcon,
  Shield,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { transferService, type TransferParams } from "@/services/wallet/TransferService";
import { nonceManager } from "@/services/wallet/NonceManager";
import { rpcManager } from "@/infrastructure/web3/rpc/RPCConnectionManager";
import { getChainInfo, getChainName } from "@/infrastructure/web3/utils/chainIds";

// External wallet connection
import { useAppKit } from '@reown/appkit/react';
import { useAccount } from 'wagmi';

// Batch Transfer Entry
export interface BatchTransferEntry {
  id: string;
  toAddress: string;
  amount: string;
  status: "pending" | "validating" | "processing" | "success" | "error" | "skipped";
  transactionHash?: string;
  error?: string;
  nonce?: number;
}

// Wallet Option Type
type WalletOption = {
  id: string;
  address: string;
  name: string;
  type: "project" | "user" | "multisig";
  balance?: string;
  blockchain?: string;
  network?: string;
  chainId?: number;
};

// Form Schema
const batchTransferSchema = z.object({
  fromWallet: z.string().min(1, "Please select a wallet"),
  asset: z.string().min(1, "Please select an asset"),
});

type BatchTransferFormValues = z.infer<typeof batchTransferSchema>;

interface BatchTransferFormProps {
  wallets: WalletOption[];
  onComplete?: (results: BatchTransferEntry[]) => void;
  onCancel?: () => void;
}

export const BatchTransferForm: React.FC<BatchTransferFormProps> = ({
  wallets,
  onComplete,
  onCancel,
}) => {
  const { toast } = useToast();
  
  // External wallet connection
  const { open } = useAppKit();
  const { isConnected, connector } = useAccount();
  
  const [entries, setEntries] = useState<BatchTransferEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUploadHint, setShowUploadHint] = useState(true);

  const form = useForm<BatchTransferFormValues>({
    resolver: zodResolver(batchTransferSchema),
    defaultValues: {
      fromWallet: "",
      asset: "ETH",
    },
  });

  const watchedFromWallet = form.watch("fromWallet");
  const watchedAsset = form.watch("asset");

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
          const lines = text.split("\n").filter((line) => line.trim());

          // Skip header if present
          const dataLines = lines[0].toLowerCase().includes("address")
            ? lines.slice(1)
            : lines;

          const newEntries: BatchTransferEntry[] = [];

          dataLines.forEach((line, index) => {
            const [address, amount] = line.split(",").map((s) => s.trim());

            if (address && amount) {
              // Basic validation
              const isValidAddress = ethers.isAddress(address);
              const isValidAmount = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

              newEntries.push({
                id: `entry-${Date.now()}-${index}`,
                toAddress: address,
                amount: amount,
                status: isValidAddress && isValidAmount ? "pending" : "error",
                error:
                  !isValidAddress
                    ? "Invalid address"
                    : !isValidAmount
                    ? "Invalid amount"
                    : undefined,
              });
            }
          });

          setEntries(newEntries);
          setShowUploadHint(false);

          const validCount = newEntries.filter((e) => e.status === "pending").length;
          const invalidCount = newEntries.length - validCount;

          toast({
            title: "File Uploaded",
            description: `Loaded ${validCount} valid entries${
              invalidCount > 0 ? `, ${invalidCount} invalid` : ""
            }`,
          });
        } catch (error) {
          console.error("CSV parsing error:", error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Failed to parse CSV file. Please check the format.",
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
    const template = "address,amount\n0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,0.1\n0x1234567890123456789012345678901234567890,0.5";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch-transfer-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Add manual entry
   */
  const addManualEntry = () => {
    const newEntry: BatchTransferEntry = {
      id: `entry-${Date.now()}`,
      toAddress: "",
      amount: "",
      status: "pending",
    };
    setEntries([...entries, newEntry]);
    setShowUploadHint(false);
  };

  /**
   * Update entry
   */
  const updateEntry = (id: string, field: "toAddress" | "amount", value: string) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id === id) {
          const updated = { ...entry, [field]: value };

          // Validate
          const isValidAddress = ethers.isAddress(updated.toAddress);
          const isValidAmount =
            !isNaN(parseFloat(updated.amount)) && parseFloat(updated.amount) > 0;

          updated.status =
            isValidAddress && isValidAmount && updated.toAddress && updated.amount
              ? "pending"
              : "error";
          updated.error =
            !isValidAddress && updated.toAddress
              ? "Invalid address"
              : !isValidAmount && updated.amount
              ? "Invalid amount"
              : undefined;

          return updated;
        }
        return entry;
      })
    );
  };

  /**
   * Remove entry
   */
  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  /**
   * Clear all entries
   */
  const clearAll = () => {
    setEntries([]);
    setShowUploadHint(true);
    setCurrentIndex(0);
  };

  /**
   * Validate all entries before processing
   */
  const validateAllEntries = async (): Promise<boolean> => {
    const wallet = wallets.find((w) => w.id === form.getValues("fromWallet"));
    if (!wallet || !wallet.chainId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select a valid wallet",
      });
      return false;
    }

    // Update all pending entries to validating
    setEntries((prev) =>
      prev.map((entry) =>
        entry.status === "pending" ? { ...entry, status: "validating" } : entry
      )
    );

    try {
      const provider = new ethers.JsonRpcProvider(
        rpcManager.getProviderConfig(wallet.blockchain as any, "testnet")?.url || ""
      );

      const balance = await provider.getBalance(wallet.address);
      let totalAmount = 0n;
      let validCount = 0;
      let invalidCount = 0;

      // Validate each entry
      for (const entry of entries) {
        if (entry.status !== "validating") continue;

        try {
          const amount = ethers.parseEther(entry.amount);
          totalAmount += amount;
          validCount++;

          // Check if address is valid
          if (!ethers.isAddress(entry.toAddress)) {
            throw new Error("Invalid address");
          }

          // Update to pending
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id ? { ...e, status: "pending", error: undefined } : e
            )
          );
        } catch (error) {
          invalidCount++;
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "error",
                    error: error instanceof Error ? error.message : "Validation failed",
                  }
                : e
            )
          );
        }
      }

      // Estimate total gas cost (rough estimate: 21000 gas per transfer)
      const feeData = await provider.getFeeData();
      const gasPerTransfer = 21000n;
      const estimatedGasCost = feeData.maxFeePerGas
        ? gasPerTransfer * BigInt(validCount) * feeData.maxFeePerGas
        : gasPerTransfer * BigInt(validCount) * (feeData.gasPrice || 0n);

      const totalCost = totalAmount + estimatedGasCost;

      if (totalCost > balance) {
        toast({
          variant: "destructive",
          title: "Insufficient Balance",
          description: `Total cost (${ethers.formatEther(
            totalCost
          )} ETH) exceeds balance (${ethers.formatEther(balance)} ETH)`,
        });
        return false;
      }

      if (invalidCount > 0) {
        toast({
          variant: "destructive",
          title: "Validation Failed",
          description: `${invalidCount} entries have errors. Please fix them before continuing.`,
        });
        return false;
      }

      toast({
        title: "Validation Successful",
        description: `${validCount} entries ready to process. Estimated cost: ${ethers.formatEther(
          totalCost
        )} ETH`,
      });

      return true;
    } catch (error) {
      console.error("Validation error:", error);
      toast({
        variant: "destructive",
        title: "Validation Failed",
        description: error instanceof Error ? error.message : "Validation failed",
      });
      return false;
    }
  };

  /**
   * Execute batch transfers sequentially with nonce management
   */
  const executeBatchTransfers = async () => {
    const wallet = wallets.find((w) => w.id === form.getValues("fromWallet"));
    if (!wallet || !wallet.chainId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Wallet not found",
      });
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);

    const validEntries = entries.filter((e) => e.status === "pending");
    const results: BatchTransferEntry[] = [];

    try {
      // Get provider
      const rpcConfig = rpcManager.getProviderConfig(wallet.blockchain as any, "testnet");
      if (!rpcConfig) {
        throw new Error(`No RPC configuration for ${wallet.blockchain}`);
      }

      const provider = new ethers.JsonRpcProvider(rpcConfig.url);

      // Check nonce status before starting
      const nonceStatus = await nonceManager.getNonceStatus(wallet.address, provider);
      if (nonceStatus.hasGap) {
        const shouldContinue = window.confirm(
          `⚠️ NONCE GAP DETECTED!\n\n` +
            `There are ${nonceStatus.gapSize} pending transactions blocking the queue.\n` +
            `Starting batch transfers now may cause failures.\n\n` +
            `Recommended: Cancel stuck transactions first.\n\n` +
            `Do you want to continue anyway?`
        );

        if (!shouldContinue) {
          setIsProcessing(false);
          return;
        }
      }

      // Process each entry sequentially
      for (let i = 0; i < validEntries.length; i++) {
        if (isPaused) {
          toast({
            title: "Paused",
            description: "Batch transfer paused. Click Resume to continue.",
          });
          break;
        }

        const entry = validEntries[i];
        setCurrentIndex(i);

        // Update status to processing
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: "processing" } : e))
        );

        try {
          // Execute transfer with nonce management
          const transferParams: TransferParams = {
            from: wallet.address,
            to: entry.toAddress,
            amount: entry.amount,
            chainId: wallet.chainId,
            walletId: wallet.id,
            walletType: wallet.type === "multisig" ? "project" : wallet.type,
          };

          const result = await transferService.executeTransfer(transferParams);

          if (result.success && result.transactionHash) {
            // Update entry with success
            setEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id
                  ? {
                      ...e,
                      status: "success",
                      transactionHash: result.transactionHash,
                      nonce: result.diagnostics?.nonce,
                    }
                  : e
              )
            );

            results.push({
              ...entry,
              status: "success",
              transactionHash: result.transactionHash,
              nonce: result.diagnostics?.nonce,
            });

            toast({
              title: `Transfer ${i + 1}/${validEntries.length} Successful`,
              description: `Sent ${entry.amount} ETH to ${entry.toAddress.slice(
                0,
                6
              )}...${entry.toAddress.slice(-4)}`,
            });
          } else {
            throw new Error(result.error || "Transfer failed");
          }

          // Small delay between transactions to prevent rate limiting
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Transfer failed for entry ${entry.id}:`, error);

          // Update entry with error
          setEntries((prev) =>
            prev.map((e) =>
              e.id === entry.id
                ? {
                    ...e,
                    status: "error",
                    error: error instanceof Error ? error.message : "Transfer failed",
                  }
                : e
            )
          );

          results.push({
            ...entry,
            status: "error",
            error: error instanceof Error ? error.message : "Transfer failed",
          });

          // Ask user if they want to continue on error
          const shouldContinue = window.confirm(
            `❌ Transfer ${i + 1} failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }\n\nDo you want to continue with remaining transfers?`
          );

          if (!shouldContinue) {
            // Skip remaining entries
            for (let j = i + 1; j < validEntries.length; j++) {
              const skippedEntry = validEntries[j];
              setEntries((prev) =>
                prev.map((e) =>
                  e.id === skippedEntry.id ? { ...e, status: "skipped" } : e
                )
              );
              results.push({
                ...skippedEntry,
                status: "skipped",
              });
            }
            break;
          }
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;
      const errorCount = results.filter((r) => r.status === "error").length;
      const skippedCount = results.filter((r) => r.status === "skipped").length;

      toast({
        title: "Batch Transfer Complete",
        description: `✅ ${successCount} successful, ❌ ${errorCount} failed, ⏭️ ${skippedCount} skipped`,
      });

      onComplete?.(results);
    } catch (error) {
      console.error("Batch transfer error:", error);
      toast({
        variant: "destructive",
        title: "Batch Transfer Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsProcessing(false);
      setCurrentIndex(0);
    }
  };

  /**
   * Start batch transfer process
   */
  const handleStart = async () => {
    const isValid = await validateAllEntries();
    if (isValid) {
      await executeBatchTransfers();
    }
  };

  /**
   * Pause batch transfer
   */
  const handlePause = () => {
    setIsPaused(true);
  };

  /**
   * Resume batch transfer
   */
  const handleResume = () => {
    setIsPaused(false);
    executeBatchTransfers();
  };

  // Calculate statistics
  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const processingCount = entries.filter((e) => e.status === "processing").length;
  const successCount = entries.filter((e) => e.status === "success").length;
  const errorCount = entries.filter((e) => e.status === "error").length;
  const totalAmount = entries
    .filter((e) => e.status !== "error" && e.amount)
    .reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  const progress =
    entries.length > 0 ? ((successCount + errorCount) / entries.length) * 100 : 0;

  // Helper functions for wallet display
  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Building2 className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      case 'multisig':
        return <Shield className="h-4 w-4" />;
      default:
        return <WalletIcon className="h-4 w-4" />;
    }
  };

  const formatBalance = (balance: string | undefined, network?: string): string => {
    if (!balance) return '0.0000';
    const numBalance = parseFloat(balance);
    if (isNaN(numBalance)) return '0.0000';
    
    const symbol = network?.toUpperCase() || 'ETH';
    return `${numBalance.toFixed(4)} ${symbol}`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Batch Transfer Configuration
          </CardTitle>
          <CardDescription>
            Send multiple transfers sequentially with automatic nonce management
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Form {...form}>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromWallet"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Wallet</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select wallet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wallets.length > 0 ? (
                          wallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex flex-col gap-1 w-full">
                                <div className="flex items-center gap-2">
                                  {getWalletIcon(wallet.type)}
                                  <span className="font-medium">{wallet.name}</span>
                                  <Badge variant="outline" className="ml-auto">
                                    {getChainInfo(wallet.chainId)?.name || wallet.blockchain || wallet.network || 'Unknown'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{formatAddress(wallet.address)}</span>
                                  <span>•</span>
                                  <span>{formatBalance(wallet.balance, wallet.network)}</span>
                                </div>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-wallets" disabled>
                            No wallets available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the wallet to send from (project wallets only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asset"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select asset" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Asset to transfer</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Form>

          {/* External Wallet Connection Section */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">External Wallet Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {isConnected ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-800">
                    Connected with {connector?.name || 'External Wallet'}
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button 
                    onClick={() => open()} 
                    variant="outline" 
                    className="w-full"
                    size="sm"
                    disabled={isProcessing}
                  >
                    <WalletIcon className="w-4 h-4 mr-2" />
                    Connect External Wallet
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Connect MetaMask, Coinbase, and 300+ wallets
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Upload Section */}
          <div className="space-y-2">
            <Label>Upload Recipients</Label>
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
                disabled={isProcessing}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV format: address,amount (one recipient per line)
            </p>
          </div>

          <Button
            variant="outline"
            onClick={addManualEntry}
            disabled={isProcessing}
            className="w-full"
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
                <CardTitle>Transfer Entries ({entries.length})</CardTitle>
                <CardDescription>
                  Total Amount: {totalAmount.toFixed(4)} {watchedAsset || "ETH"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {!isProcessing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAll}
                    disabled={isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isProcessing && !isPaused && (
                  <Button variant="outline" size="sm" onClick={handlePause}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                )}
                {isProcessing && isPaused && (
                  <Button variant="outline" size="sm" onClick={handleResume}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Processing: {currentIndex + 1} / {entries.length}
                  </span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} />
              </div>
            )}

            {/* Statistics */}
            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span>Pending: {pendingCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Processing: {processingCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>Success: {successCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>Error: {errorCount}</span>
              </div>
            </div>

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
                        {!isProcessing && entry.status === "pending" ? (
                          <Input
                            value={entry.toAddress}
                            onChange={(e) =>
                              updateEntry(entry.id, "toAddress", e.target.value)
                            }
                            placeholder="0x..."
                            className="h-8 font-mono text-xs"
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
                        {entry.error && (
                          <p className="text-xs text-red-500">{entry.error}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isProcessing && entry.status === "pending" ? (
                          <Input
                            type="number"
                            value={entry.amount}
                            onChange={(e) => updateEntry(entry.id, "amount", e.target.value)}
                            placeholder="0.00"
                            className="h-8 text-xs"
                            step="0.0001"
                          />
                        ) : (
                          <span className="text-xs">{entry.amount}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "success"
                              ? "default"
                              : entry.status === "error"
                              ? "destructive"
                              : entry.status === "processing"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {entry.status === "processing" && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {entry.status === "success" && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {entry.status === "error" && <XCircle className="mr-1 h-3 w-3" />}
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!isProcessing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry(entry.id)}
                            disabled={isProcessing}
                          >
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
        </Card>
      )}

      {/* Action Buttons */}
      {entries.length > 0 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleStart}
            disabled={
              isProcessing || pendingCount === 0 || !watchedFromWallet || !watchedAsset
            }
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Start Batch Transfer ({pendingCount} entries)
              </>
            )}
          </Button>
        </div>
      )}

      {/* Show hint if no entries */}
      {entries.length === 0 && showUploadHint && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Recipients Added</AlertTitle>
          <AlertDescription>
            Upload a CSV file or add manual entries to get started. CSV should contain two
            columns: address and amount.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};