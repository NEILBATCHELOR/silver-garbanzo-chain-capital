/**
 * XRPL Multi-Sig Transaction Proposal
 * Create new multi-signature transaction proposals
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileSignature } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { XRPLMultiSigTransactionProposalProps } from './types';
import { xrplMultiSigDatabaseService } from '@/services/wallet/ripple/security';
import { Payment, AccountSet, TrustSet } from 'xrpl';

type TransactionType = 'payment' | 'trust_set' | 'account_set';

export function XRPLMultiSigTransactionProposal({
  projectId,
  walletAddress,
  onSuccess
}: XRPLMultiSigTransactionProposalProps) {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<TransactionType>('payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Payment fields
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build transaction based on type
      let transaction: any;
      
      if (transactionType === 'payment') {
        if (!destination || !amount) {
          toast({
            title: 'Missing Fields',
            description: 'Please provide destination and amount',
            variant: 'destructive'
          });
          return;
        }

        transaction = {
          TransactionType: 'Payment',
          Account: walletAddress,
          Destination: destination,
          Amount: amount,
          Memos: memo ? [{
            Memo: {
              MemoData: Buffer.from(memo).toString('hex')
            }
          }] : undefined
        };
      }

      // Get signer list to calculate required weight
      const account = await xrplMultiSigDatabaseService.getMultiSigAccount(
        walletAddress
      );

      if (!account) {
        throw new Error('Multi-sig account not found');
      }

      // Create pending transaction
      const pendingTx = await xrplMultiSigDatabaseService.createPendingTransactionByWallet(
        walletAddress,
        transaction,
        JSON.stringify(transaction),
        account.signer_quorum
      );

      toast({
        title: 'Proposal Created',
        description: `Transaction proposal created and awaiting signatures`,
      });

      // Reset form
      setDestination('');
      setAmount('');
      setMemo('');

      onSuccess?.(pendingTx.id);
    } catch (error) {
      console.error('[XRPLMultiSigTransactionProposal] Error:', error);
      toast({
        title: 'Proposal Failed',
        description: error instanceof Error ? error.message : 'Failed to create proposal',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSignature className="mr-2 h-5 w-5" />
          Create Transaction Proposal
        </CardTitle>
        <CardDescription>
          Propose a new multi-signature transaction for approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="tx-type">Transaction Type</Label>
            <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
              <SelectTrigger id="tx-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="trust_set">Trust Line</SelectItem>
                <SelectItem value="account_set">Account Settings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Fields */}
          {transactionType === 'payment' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Address</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="r..."
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (drops)</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memo">Memo (Optional)</Label>
                <Textarea
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="Transaction memo..."
                  rows={2}
                />
              </div>
            </>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating Proposal...' : 'Create Proposal'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
