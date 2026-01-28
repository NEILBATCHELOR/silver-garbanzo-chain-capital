/**
 * Solana Batch Transfer Component
 * Send tokens to multiple recipients in a single transaction
 * 
 * Features:
 * - CSV import
 * - Manual recipient entry
 * - Amount validation
 * - Cost estimation
 * - Progress tracking
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { 
  Send, 
  Plus, 
  X, 
  Upload, 
  Download,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { modernSolanaTokenTransferService } from '@/services/wallet/solana/ModernSolanaTokenTransferService';
import type { Address } from '@solana/kit';

// ============================================================================
// TYPES
// ============================================================================

interface BatchRecipient {
  address: string;
  amount: string;
  status?: 'pending' | 'success' | 'failed';
  error?: string;
}

interface BatchTransferProps {
  tokenAddress: string;
  tokenSymbol: string;
  decimals: number;
  availableBalance: string;
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  signerPrivateKey: string; // Private key for signing transactions
  onTransferComplete?: (results: BatchRecipient[]) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function BatchTransfer({
  tokenAddress,
  tokenSymbol,
  decimals,
  availableBalance,
  network,
  signerPrivateKey,
  onTransferComplete
}: BatchTransferProps) {
  const { toast } = useToast();
  const [recipients, setRecipients] = useState<BatchRecipient[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showCsvInput, setShowCsvInput] = useState(false);

  const addRecipient = () => {
    setRecipients([
      ...recipients,
      { address: '', amount: '', status: 'pending' }
    ]);
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const updateRecipient = (index: number, field: keyof BatchRecipient, value: string) => {
    const updated = [...recipients];
    updated[index] = { ...updated[index], [field]: value };
    setRecipients(updated);
  };

  const handleCsvImport = (csvText: string) => {
    try {
      const lines = csvText.trim().split('\n');
      const imported: BatchRecipient[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip header if present
        if (i === 0 && (line.toLowerCase().includes('address') || line.toLowerCase().includes('amount'))) {
          continue;
        }

        const [address, amount] = line.split(',').map(s => s.trim());
        
        if (address && amount) {
          imported.push({
            address,
            amount,
            status: 'pending'
          });
        }
      }

      if (imported.length === 0) {
        throw new Error('No valid recipients found in CSV');
      }

      setRecipients([...recipients, ...imported]);
      setShowCsvInput(false);

      toast({
        title: 'Import Successful',
        description: `Added ${imported.length} recipient(s)`
      });
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Invalid CSV format',
        variant: 'destructive'
      });
    }
  };

  const downloadTemplate = () => {
    const template = 'address,amount\n' +
      '7xKXtg...9uYz2,100\n' +
      '8yLZt...3vXw1,50\n' +
      '9zMAt...7wQp4,75';

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch_transfer_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateRecipients = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (recipients.length === 0) {
      errors.push('No recipients added');
      return { valid: false, errors };
    }

    let totalAmount = BigInt(0);
    const addresses = new Set<string>();

    recipients.forEach((recipient, index) => {
      // Validate address
      if (!recipient.address) {
        errors.push(`Recipient ${index + 1}: Address is required`);
      } else if (recipient.address.length < 32) {
        errors.push(`Recipient ${index + 1}: Invalid address format`);
      } else if (addresses.has(recipient.address)) {
        errors.push(`Recipient ${index + 1}: Duplicate address`);
      } else {
        addresses.add(recipient.address);
      }

      // Validate amount
      if (!recipient.amount || parseFloat(recipient.amount) <= 0) {
        errors.push(`Recipient ${index + 1}: Invalid amount`);
      } else {
        const amount = BigInt(parseFloat(recipient.amount) * Math.pow(10, decimals));
        totalAmount += amount;
      }
    });

    // Check balance
    const balance = BigInt(availableBalance);
    if (totalAmount > balance) {
      errors.push(
        `Insufficient balance: Need ${formatAmount(totalAmount.toString(), decimals)} ${tokenSymbol}, have ${formatAmount(availableBalance, decimals)} ${tokenSymbol}`
      );
    }

    return { valid: errors.length === 0, errors };
  };

  const processBatchTransfer = async () => {
    const validation = validateRecipients();
    if (!validation.valid) {
      toast({
        title: 'Validation Failed',
        description: validation.errors[0],
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);

      // Get signer address for the from field
      const fromAddress = await modernSolanaTokenTransferService.getAddressFromPrivateKey(
        signerPrivateKey
      );

      // Process each transfer sequentially
      const updated = [...recipients];
      
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        try {
          // Convert amount to smallest units
          const amount = BigInt(
            Math.floor(parseFloat(recipient.amount) * Math.pow(10, decimals))
          );

          // Execute transfer
          const result = await modernSolanaTokenTransferService.transferTokens(
            {
              mint: tokenAddress as Address,
              from: fromAddress,
              to: recipient.address as Address,
              amount,
              decimals
            },
            {
              network,
              signerPrivateKey,
              createDestinationATA: true
            }
          );

          // Update recipient status
          if (result.success) {
            updated[i].status = 'success';
          } else {
            updated[i].status = 'failed';
            updated[i].error = result.errors?.join(', ') || 'Transfer failed';
          }

        } catch (error) {
          // Handle transfer error
          updated[i].status = 'failed';
          updated[i].error = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Transfer ${i + 1} failed:`, error);
        }

        // Update UI
        setRecipients([...updated]);
        setProgress(((i + 1) / recipients.length) * 100);
      }

      const successful = updated.filter(r => r.status === 'success').length;
      const failed = updated.filter(r => r.status === 'failed').length;

      toast({
        title: 'Batch Transfer Complete',
        description: `${successful} successful, ${failed} failed`
      });

      onTransferComplete?.(updated);
    } catch (error) {
      console.error('Batch transfer error:', error);
      toast({
        title: 'Transfer Failed',
        description: error instanceof Error ? error.message : 'Batch transfer failed to complete',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (amount: string, decimals: number): string => {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      maximumFractionDigits: decimals > 4 ? 4 : decimals
    });
  };

  const getTotalAmount = (): string => {
    const total = recipients.reduce((sum, recipient) => {
      const amount = parseFloat(recipient.amount) || 0;
      return sum + amount;
    }, 0);
    return total.toFixed(decimals > 4 ? 4 : decimals);
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'success') {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === 'failed') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Batch Transfer
            </CardTitle>
            <CardDescription>
              Send {tokenSymbol} to multiple recipients
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4 mr-2" />
              Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCsvInput(!showCsvInput)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* CSV Import */}
        {showCsvInput && (
          <div className="space-y-2">
            <Label>CSV Data</Label>
            <Textarea
              placeholder="Paste CSV data: address,amount"
              rows={5}
              onChange={(e) => handleCsvImport(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Format: address,amount (one per line)
            </p>
          </div>
        )}

        {/* Recipients List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Recipients ({recipients.length})</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={addRecipient}
              disabled={isProcessing}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {recipients.map((recipient, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 border rounded-lg"
              >
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Recipient address"
                    value={recipient.address}
                    onChange={(e) =>
                      updateRecipient(index, 'address', e.target.value)
                    }
                    disabled={isProcessing}
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={recipient.amount}
                    onChange={(e) =>
                      updateRecipient(index, 'amount', e.target.value)
                    }
                    disabled={isProcessing}
                  />
                  {recipient.error && (
                    <p className="text-xs text-red-500">{recipient.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(recipient.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRecipient(index)}
                    disabled={isProcessing}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {recipients.length > 0 && (
          <Alert>
            <AlertDescription>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Recipients</p>
                  <p className="font-semibold">{recipients.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-semibold">
                    {getTotalAmount()} {tokenSymbol}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Available</p>
                  <p className="font-semibold">
                    {formatAmount(availableBalance, decimals)} {tokenSymbol}
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-center text-muted-foreground">
              Processing transfers... {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Execute Button */}
        <Button
          className="w-full"
          onClick={processBatchTransfer}
          disabled={isProcessing || recipients.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processing...' : `Send to ${recipients.length} Recipient(s)`}
        </Button>
      </CardContent>
    </Card>
  );
}

export default BatchTransfer;
