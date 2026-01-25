/**
 * Token Instructions Viewer
 * Displays all token instructions from the blockchain
 * Similar to Solana Explorer's instructions tab
 * 
 * Fetches and displays:
 * - Transaction Signature
 * - Age (relative time)
 * - Instruction Type (Mint To, Initialize Mint, etc.)
 * - Program (Token Program, Token-2022 Program, etc.)
 * - Result (Success/Failed)
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import {
  RefreshCw,
  ExternalLink,
  Code,
  AlertCircle
} from 'lucide-react';
import { modernSolanaBlockchainQueryService } from '@/services/wallet/solana';
import type { TokenInstruction } from '@/services/wallet/solana/ModernSolanaBlockchainQueryService';
import type { SolanaNetwork } from '@/infrastructure/web3/solana/ModernSolanaTypes';
import { solanaExplorer } from '@/infrastructure/web3/solana';
import { Alert, AlertDescription } from '@/components/ui/alert';

// ============================================================================
// TYPES
// ============================================================================

interface TokenInstructionsViewerProps {
  tokenAddress: string;
  network: SolanaNetwork;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TokenInstructionsViewer({
  tokenAddress,
  network
}: TokenInstructionsViewerProps) {
  const { toast } = useToast();
  const [instructions, setInstructions] = useState<TokenInstruction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Normalize network (remove 'solana-' prefix if present)
  const normalizedNetwork = (network.replace('solana-', '') as SolanaNetwork);

  useEffect(() => {
    loadInstructions();
  }, [tokenAddress, network]);

  const loadInstructions = async () => {
    try {
      setIsLoading(true);

      const result = await modernSolanaBlockchainQueryService.getTokenInstructions(
        tokenAddress,
        normalizedNetwork,
        50 // Limit to 50 most recent instructions
      );

      setInstructions(result);

      toast({
        title: 'Instructions Loaded',
        description: `Found ${result.length} token instructions`
      });
    } catch (error) {
      console.error('Error loading token instructions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load token instructions from blockchain',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: 'success' | 'failed') => {
    return status === 'success' ? (
      <Badge variant="default">Success</Badge>
    ) : (
      <Badge variant="destructive">Failed</Badge>
    );
  };

  const shortenSignature = (signature: string): string => {
    return `${signature.slice(0, 8)}...${signature.slice(-8)}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Token Instructions
          </CardTitle>
          <CardDescription>Loading instructions from blockchain...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3 border rounded">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Token Instructions
            </CardTitle>
            <CardDescription>
              All on-chain instructions for this token mint
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadInstructions}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Showing real-time instruction data from Solana blockchain ({normalizedNetwork}). This includes all token operations
            (Initialize Mint, Mint To, Transfer, etc.) for mint address {tokenAddress.slice(0, 8)}...
          </AlertDescription>
        </Alert>

        {instructions.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No instructions found</p>
            <p className="text-sm mt-1">This token hasn't been used yet</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Signature</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Instruction</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructions.map((instruction, index) => (
                  <TableRow key={`${instruction.signature}-${index}`}>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {shortenSignature(instruction.signature)}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {instruction.age}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Badge variant="outline">{instruction.instruction}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {instruction.program}
                    </TableCell>
                    <TableCell>{getStatusBadge(instruction.result)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          window.open(
                            solanaExplorer.tx(instruction.signature, normalizedNetwork),
                            '_blank'
                          )
                        }
                        title="View on Solana Explorer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Data Source */}
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>✅ Live data from Solana blockchain</span>
              <span>{instructions.length} instruction{instructions.length === 1 ? '' : 's'} loaded</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TokenInstructionsViewer;
