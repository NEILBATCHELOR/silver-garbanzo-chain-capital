/**
 * Solana Project Wallet Generator Component
 * 
 * Handles Solana wallet generation for projects
 * Uses enhanced project wallet service for proper encryption
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
import { enhancedProjectWalletService } from '@/services/project/project-wallet-service';
import { useAuth } from "@/hooks/auth/useAuth";

interface SolanaProjectWalletGeneratorProps {
  projectId: string;
  projectName: string;
  projectType: string;
  onWalletGenerated?: (wallet: any) => void;
}

type SolanaNetwork = 'mainnet' | 'devnet' | 'testnet';

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
    { value: 'mainnet', label: '🟢 Solana Mainnet', isTestnet: false },
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
      
      // ✅ FIX: Use enhancedProjectWalletService which properly encrypts keys
      const result = await enhancedProjectWalletService.generateWalletForProject({
        projectId,
        projectName,
        projectType,
        network: 'solana', // ✅ Always use 'solana' for WalletGeneratorFactory
        networkEnvironment: selectedNetwork as 'mainnet' | 'testnet' | 'devnet',
        nonEvmNetwork: 'solana',
        includePrivateKey,
        includeMnemonic,
        userId: user.id
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate wallet');
      }

      setGeneratedWallet(result);

      if (onWalletGenerated) {
        onWalletGenerated(result);
      }

      toast({
        title: "Success",
        description: `Solana ${selectedNetwork} wallet generated and encrypted successfully`,
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
  }, [selectedNetwork, projectId, projectName, projectType, includePrivateKey, includeMnemonic, onWalletGenerated, toast, user]);

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
            {selectedNetwork === 'mainnet' && (
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
                  Include private key (encrypted in database)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-mnemonic"
                  checked={includeMnemonic}
                  onCheckedChange={(checked) => setIncludeMnemonic(checked === true)}
                />
                <label htmlFor="include-mnemonic" className="text-sm">
                  Include mnemonic phrase (encrypted in database)
                </label>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              🔒 All private keys and mnemonics are encrypted using AES-256-GCM before storage
            </AlertDescription>
          </Alert>

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
            {isGenerating ? 'Generating...' : 'Generate Encrypted Wallet'}
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
                <span>Encrypted in Database</span>
              </Badge>
              {generatedWallet.privateKeyVaultId && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Key className="h-3 w-3" />
                  <span>Key Vault</span>
                </Badge>
              )}
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

            {/* Private Key (Unencrypted for display only - still encrypted in DB) */}
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
                <Alert className="mt-2">
                  <AlertDescription className="text-xs">
                    🔒 This key is displayed unencrypted for your convenience, but is stored encrypted in the database using AES-256-GCM
                  </AlertDescription>
                </Alert>
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
                    It can be used to recover your wallet and access all funds. This is encrypted in the database.
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
                  const explorerUrl = `https://explorer.solana.com/address/${generatedWallet.walletAddress}${selectedNetwork !== 'mainnet' ? `?cluster=${selectedNetwork}` : ''}`;
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