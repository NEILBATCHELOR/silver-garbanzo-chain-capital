/**
 * Solana Project Wallet Generator Component
 * 
 * Handles Solana wallet generation for projects
 * Uses ModernSolanaWalletGenerator for wallet creation
 */

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, 
  Shield, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  RefreshCw,
  Key
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { modernSolanaWalletGenerator } from '@/services/wallet/generators/ModernSolanaWalletGenerator';
import { supabase } from '@/infrastructure/database/client';
import { useAuth } from "@/hooks/auth/useAuth";

interface SolanaProjectWalletGeneratorProps {
  projectId: string;
  projectName: string;
  projectType: string;
  onWalletGenerated?: (wallet: any) => void;
}

type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

export const SolanaProjectWalletGenerator: React.FC<SolanaProjectWalletGeneratorProps> = ({
  projectId,
  projectName,
  projectType,
  onWalletGenerated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState<SolanaNetwork>('devnet');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWallet, setGeneratedWallet] = useState<any | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [includePrivateKey, setIncludePrivateKey] = useState(true);
  const [includeMnemonic, setIncludeMnemonic] = useState(true);

  const networks: { value: SolanaNetwork; label: string; isTestnet: boolean }[] = [
    { value: 'mainnet-beta', label: '🟢 Solana Mainnet', isTestnet: false },
    { value: 'devnet', label: '🟡 Solana Devnet', isTestnet: true },
    { value: 'testnet', label: '🟡 Solana Testnet', isTestnet: true },
  ];

  const generateWallet = useCallback(async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate a wallet",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedWallet(null);

    try {
      console.log(`[SolanaWalletGenerator] Generating ${selectedNetwork} wallet for project ${projectId}`);
      
      // Generate wallet using ModernSolanaWalletGenerator
      const wallet = await modernSolanaWalletGenerator.generateWallet({
        includeMnemonic,
        mnemonicStrength: 128 // 12 words
      });

      // Store wallet in database
      const { data: projectWallet, error: projectWalletError } = await supabase
        .from('project_wallets')
        .insert({
          project_id: projectId,
          wallet_address: wallet.address,
          public_key: wallet.publicKey,
          private_key: includePrivateKey ? wallet.privateKey : null,
          mnemonic: includeMnemonic ? wallet.mnemonic : null,
          wallet_type: 'solana',
          non_evm_network: selectedNetwork,
          chain_id: null, // Solana doesn't use chain IDs
          network_environment: selectedNetwork === 'mainnet-beta' ? 'mainnet' : 'testnet',
          created_by: user.id
        })
        .select()
        .single();

      if (projectWalletError) {
        throw projectWalletError;
      }

      const result = {
        success: true,
        walletAddress: wallet.address,
        publicKey: wallet.publicKey,
        privateKey: includePrivateKey ? wallet.privateKey : undefined,
        mnemonic: includeMnemonic ? wallet.mnemonic : undefined,
        network: 'solana',
        nonEvmNetwork: selectedNetwork,
        chainId: null,
        projectWalletId: projectWallet.id
      };

      setGeneratedWallet(result);

      if (onWalletGenerated) {
        onWalletGenerated(result);
      }

      toast({
        title: "Success",
        description: `Solana ${selectedNetwork} wallet generated successfully`,
      });
    } catch (error) {
      console.error('Error generating Solana wallet:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate wallet",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedNetwork, projectId, includePrivateKey, includeMnemonic, onWalletGenerated, toast, user]);

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  }, [toast]);

  return (
    <div className="space-y-6">
      {/* Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wallet className="mr-2 h-5 w-5" />
            Generate Solana Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Network Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Network:</label>
            <Select value={selectedNetwork} onValueChange={(val) => setSelectedNetwork(val as SolanaNetwork)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose Solana network" />
              </SelectTrigger>
              <SelectContent>
                {networks.map((network) => (
                  <SelectItem key={network.value} value={network.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{network.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedNetwork === 'mainnet-beta' && (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>
                  ⚠️ Warning: Mainnet wallets control real SOL and assets. Use with caution.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Generation Options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Generation Options:</label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-private-key"
                  checked={includePrivateKey}
                  onCheckedChange={(checked) => setIncludePrivateKey(checked === true)}
                />
                <label htmlFor="include-private-key" className="text-sm">
                  Include private key (base58 format)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-mnemonic"
                  checked={includeMnemonic}
                  onCheckedChange={(checked) => setIncludeMnemonic(checked === true)}
                />
                <label htmlFor="include-mnemonic" className="text-sm">
                  Include mnemonic phrase (12 words)
                </label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={generateWallet}
            disabled={isGenerating || !user}
            className="w-full"
          >
            {isGenerating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Wallet'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Wallet Display */}
      {generatedWallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              Solana Wallet Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Network Badge */}
            <div className="flex items-center space-x-2 flex-wrap">
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>◎</span>
                <span>Solana</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>{selectedNetwork}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Stored in Database</span>
              </Badge>
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Wallet className="mr-1 h-4 w-4" />
                Wallet Address:
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {generatedWallet.walletAddress}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedWallet.walletAddress, 'Wallet address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center">
                <Key className="mr-1 h-4 w-4" />
                Public Key:
              </label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {generatedWallet.publicKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedWallet.publicKey, 'Public key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Private Key */}
            {generatedWallet.privateKey && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <Shield className="mr-1 h-4 w-4" />
                  Private Key (Base58):
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {showPrivateKey ? generatedWallet.privateKey : '••••••••••••••••••••••••••••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedWallet.privateKey, 'Private key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Mnemonic Phrase */}
            {generatedWallet.mnemonic && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center">
                  <Key className="mr-1 h-4 w-4" />
                  Mnemonic Phrase (12 words):
                </label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                    {showMnemonic ? generatedWallet.mnemonic : '•••••• •••••• •••••• •••••• •••••• ••••••'}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMnemonic(!showMnemonic)}
                  >
                    {showMnemonic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedWallet.mnemonic, 'Mnemonic phrase')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Alert className="mt-2">
                  <AlertDescription className="text-xs">
                    <strong>⚠️ Security Warning:</strong> Store this mnemonic phrase securely. 
                    It can be used to recover your wallet and access all funds.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Explorer Link */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const explorerUrl = `https://explorer.solana.com/address/${generatedWallet.walletAddress}${selectedNetwork !== 'mainnet-beta' ? `?cluster=${selectedNetwork}` : ''}`;
                  window.open(explorerUrl, '_blank');
                }}
              >
                View on Solana Explorer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
