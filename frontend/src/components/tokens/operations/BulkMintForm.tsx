/**
 * Bulk Mint Form Component
 * Allows batch minting of ERC-20 tokens to multiple addresses
 * Similar pattern to BatchTransferForm
 */

import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
} from 'lucide-react';

// Batch Mint Entry
export interface BulkMintEntry {
  id: string;
  toAddress: string;
  amount: string;
  status: 'pending' | 'validating' | 'processing' | 'success' | 'error';
  transactionHash?: string;
  error?: string;
}

interface BulkMintFormProps {
  onEntriesUpdate: (entries: BulkMintEntry[]) => void;
  onClear?: () => void;
}

export const BulkMintForm: React.FC<BulkMintFormProps> = ({
  onEntriesUpdate,
  onClear,
}) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<BulkMintEntry[]>([]);
  const [showUploadHint, setShowUploadHint] = useState(true);

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
          onEntriesUpdate(newEntries);
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
    [toast, onEntriesUpdate]
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
    onEntriesUpdate(updated);
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
    onEntriesUpdate(updated);
  };

  /**
   * Remove entry
   */
  const removeEntry = (id: string) => {
    const updated = entries.filter((entry) => entry.id !== id);
    setEntries(updated);
    onEntriesUpdate(updated);
  };

  /**
   * Clear all entries
   */
  const clearAll = () => {
    setEntries([]);
    onEntriesUpdate([]);
    setShowUploadHint(true);
    onClear?.();
  };

  // Calculate statistics
  const pendingCount = entries.filter((e) => e.status === 'pending').length;
  const successCount = entries.filter((e) => e.status === 'success').length;
  const errorCount = entries.filter((e) => e.status === 'error').length;
  const totalAmount = entries
    .filter((e) => e.status !== 'error' && e.amount)
    .reduce((sum, e) => sum + parseFloat(e.amount || '0'), 0);

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Mint Recipients</CardTitle>
          <CardDescription>
            Upload a CSV file or add recipients manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            CSV format: address,amount (one recipient per line)
          </p>

          <Button variant="outline" onClick={addManualEntry} className="w-full">
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
                  Total Amount: {totalAmount.toLocaleString()} tokens
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={clearAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Statistics */}
            <div className="mb-4 flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <span>Pending: {pendingCount}</span>
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
                        {entry.status === 'pending' ? (
                          <Input
                            value={entry.toAddress}
                            onChange={(e) =>
                              updateEntry(entry.id, 'toAddress', e.target.value)
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
                        {entry.status === 'pending' ? (
                          <Input
                            type="number"
                            value={entry.amount}
                            onChange={(e) =>
                              updateEntry(entry.id, 'amount', e.target.value)
                            }
                            placeholder="0"
                            className="h-8 text-xs"
                            step="1"
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
                              : 'outline'
                          }
                          className="text-xs"
                        >
                          {entry.status === 'processing' && (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          )}
                          {entry.status === 'success' && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {entry.status === 'error' && (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {entry.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEntry(entry.id)}
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
    </div>
  );
};

export default BulkMintForm;
