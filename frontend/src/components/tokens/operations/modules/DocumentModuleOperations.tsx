/**
 * Document Module Operations
 * Provides UI for viewing and managing token-related documents
 */

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { providerManager, NetworkEnvironment } from '@/infrastructure/web3/ProviderManager';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';

interface DocumentModuleOperationsProps {
  moduleAddress: string;
  tokenAddress: string;
  chain: SupportedChain;
  environment?: 'mainnet' | 'testnet';
}

interface TokenDocument {
  name: string;
  uri: string;
  hash: string;
  lastModified: bigint;
}

const DOCUMENT_MODULE_ABI = [
  'function getDocument(bytes32 name) external view returns (string uri, bytes32 documentHash, uint256 lastModified)',
  'function getAllDocumentNames() external view returns (bytes32[] memory)'
];

export const DocumentModuleOperations: React.FC<DocumentModuleOperationsProps> = ({
  moduleAddress,
  tokenAddress,
  chain,
  environment = 'testnet'
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<TokenDocument[]>([]);

  useEffect(() => {
    loadDocuments();
  }, [moduleAddress, chain]);

  const loadDocuments = async () => {
    try {
      setLoading(true);

      const env = environment === 'mainnet' ? NetworkEnvironment.MAINNET : NetworkEnvironment.TESTNET;
      const provider = providerManager.getProviderForEnvironment(chain, env);
      
      if (!provider) throw new Error('Provider not available');

      const documentContract = new ethers.Contract(moduleAddress, DOCUMENT_MODULE_ABI, provider);

      // Get all document names
      const names = await documentContract.getAllDocumentNames();

      // Get details for each document
      const docs: TokenDocument[] = [];
      for (const nameBytes of names) {
        const [uri, hash, lastModified] = await documentContract.getDocument(nameBytes);
        const name = ethers.decodeBytes32String(nameBytes);
        
        docs.push({
          name,
          uri,
          hash,
          lastModified
        });
      }

      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Failed to load documents',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Token Documents
        </CardTitle>
        <CardDescription>
          View official documents attached to this token
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No documents have been attached to this token yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">{doc.name}</h4>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Hash: <code className="text-xs">{formatHash(doc.hash)}</code></p>
                    <p>Last Modified: {formatDate(doc.lastModified)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Official</Badge>
                  <a
                    href={doc.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
