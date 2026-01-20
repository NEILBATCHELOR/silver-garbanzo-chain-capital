/**
 * XRP Project Wallet Generator
 * Integrates with ProjectWalletGenerator pattern for XRP wallet creation
 * Follows same architecture as other blockchain integrations
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { 
  Wallet, 
  Shield, 
  Copy, 
  Eye, 
  EyeOff, 
  Plus, 
  CheckCircle, 
  AlertTriangle,
  Key,
  RefreshCw,
  ShieldAlert
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { ProjectWalletResult, enhancedProjectWalletService } from '@/services/project/project-wallet-service'
import { useAuth } from "@/hooks/auth/useAuth"
import { usePermissionsContext } from "@/hooks/auth/usePermissions"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface XRPLProjectWalletGeneratorProps {
  projectId: string
  projectName: string
  projectType: string
  onWalletGenerated?: (wallet: ProjectWalletResult) => void
}

// Module-level lock to prevent concurrent wallet generation
const inProgressProjectGenerations = new Set<string>()

export const XRPLProjectWalletGenerator: React.FC<XRPLProjectWalletGeneratorProps> = ({
  projectId,
  projectName,
  projectType,
  onWalletGenerated
}) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { hasPermission } = usePermissionsContext()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedWallet, setGeneratedWallet] = useState<ProjectWalletResult | null>(null)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [includePrivateKey, setIncludePrivateKey] = useState(true)
  const [includeMnemonic, setIncludeMnemonic] = useState(true)
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('testnet')
  const [hasRequiredPermissions, setHasRequiredPermissions] = useState<boolean | null>(null)
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(true)
  
  const generationInProgressRef = useRef(false)
  const lastGenerationIdRef = useRef<string>('')
  const generationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check permissions on component mount
  useEffect(() => {
    const checkPermissions = async () => {
      setIsCheckingPermissions(true)
      if (!user) {
        setHasRequiredPermissions(false)
        setIsCheckingPermissions(false)
        return
      }

      try {
        const hasCreatePermission = await hasPermission('project.create')
        const hasEditPermission = await hasPermission('project.edit')
        setHasRequiredPermissions(hasCreatePermission && hasEditPermission)
      } catch (error) {
        console.error('Error checking permissions:', error)
        setHasRequiredPermissions(false)
      } finally {
        setIsCheckingPermissions(false)
      }
    }

    checkPermissions()
  }, [user, hasPermission])

  const generateRequestId = useCallback(() => {
    return `${projectId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [projectId])

  const generateWallet = useCallback(async (requestId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to generate a wallet",
        variant: "destructive"
      })
      generationInProgressRef.current = false
      return
    }

    if (hasRequiredPermissions === false) {
      toast({
        title: "Permission Denied",
        description: "You need project.create and project.edit permissions to generate a wallet",
        variant: "destructive"
      })
      generationInProgressRef.current = false
      return
    }

    setIsGenerating(true)
    setGeneratedWallet(null)

    try {
      console.log(`[XRPLWalletGenerator] Generating wallet for ${network}, request: ${requestId}`)
      
      const result = await enhancedProjectWalletService.generateWalletForProject({
        projectId,
        projectName,
        projectType,
        network: 'ripple',
        networkEnvironment: network,
        chainId: null,
        nonEvmNetwork: 'ripple',
        includePrivateKey,
        includeMnemonic,
        userId: user.id
      })

      if (result.success) {
        setGeneratedWallet(result)
        
        if (onWalletGenerated) {
          onWalletGenerated(result)
        }
        
        toast({
          title: "Success",
          description: `XRP ${network} wallet generated successfully`,
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate wallet",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error generating wallet:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }, [network, projectId, projectName, projectType, includePrivateKey, includeMnemonic, onWalletGenerated, toast, user, hasRequiredPermissions])

  const onGenerateClick = useCallback(() => {
    if (inProgressProjectGenerations.has(projectId)) {
      console.warn(`[XRPLWalletGenerator] Wallet generation already in progress for project ${projectId}`)
      return
    }

    if (generationInProgressRef.current) {
      console.warn('[XRPLWalletGenerator] Generation already in progress')
      return
    }
    
    const requestId = generateRequestId()
    
    if (lastGenerationIdRef.current === requestId) {
      console.log("Duplicate request ID detected - ignoring click")
      return
    }
    
    lastGenerationIdRef.current = requestId
    generationInProgressRef.current = true
    inProgressProjectGenerations.add(projectId)
    
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current)
    }
    
    generationTimeoutRef.current = setTimeout(() => {
      generationInProgressRef.current = false
      console.log("Generation timeout - releasing lock")
    }, 30000)
    
    const generate = async () => {
      try {
        await generateWallet(requestId)
      } finally {
        generationInProgressRef.current = false
        inProgressProjectGenerations.delete(projectId)
        if (generationTimeoutRef.current) {
          clearTimeout(generationTimeoutRef.current)
          generationTimeoutRef.current = null
        }
      }
    }
    
    generate()
  }, [generateRequestId, generateWallet, projectId])

  const copyToClipboard = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }, [toast])

  return (
    <div className="space-y-6">
      {/* Permission Check Warning */}
      {isCheckingPermissions ? (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Checking permissions...
          </AlertDescription>
        </Alert>
      ) : hasRequiredPermissions === false ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Permission Denied</AlertTitle>
          <AlertDescription>
            You need both project.create and project.edit permissions to generate wallet credentials.
            Please contact your administrator for access.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Generation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="mr-2 h-5 w-5" />
            Generate New XRP Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Network Selection */}
          <div className="space-y-2">
            <Label>Select Network</Label>
            <Select value={network} onValueChange={(value: 'mainnet' | 'testnet') => setNetwork(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="testnet">
                  <span className="flex items-center gap-2">
                    🟡 Testnet (Safe for development)
                  </span>
                </SelectItem>
                <SelectItem value="mainnet">
                  <span className="flex items-center gap-2">
                    🟢 Mainnet (Production)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {network === 'mainnet' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Warning: Mainnet wallets control real XRP assets. Use with caution.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Generation Options */}
          <div className="space-y-2">
            <Label>Generation Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-private-key"
                  checked={includePrivateKey}
                  onCheckedChange={(checked) => setIncludePrivateKey(checked === true)}
                />
                <label htmlFor="include-private-key" className="text-sm">
                  Include private key in response (required for vault storage)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-mnemonic"
                  checked={includeMnemonic}
                  onCheckedChange={(checked) => setIncludeMnemonic(checked === true)}
                />
                <label htmlFor="include-mnemonic" className="text-sm">
                  Include mnemonic phrase (for HD wallet backup)
                </label>
              </div>
            </div>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={onGenerateClick}
            disabled={isGenerating || isCheckingPermissions || hasRequiredPermissions === false || !user}
            className="w-full"
          >
            {isGenerating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wallet className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? 'Generating...' : 'Generate XRP Wallet'}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Wallet Display */}
      {generatedWallet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
              XRP Wallet Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Network Badge */}
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>Network: {generatedWallet.nonEvmNetwork || 'ripple'}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>Environment: {network}</span>
              </Badge>
              {(generatedWallet.privateKeyVaultId || generatedWallet.mnemonicVaultId) && (
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Shield className="h-3 w-3" />
                  <span>Vault Stored</span>
                </Badge>
              )}
            </div>

            {/* Wallet Address */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <Wallet className="mr-1 h-4 w-4" />
                Wallet Address
              </Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {generatedWallet.walletAddress}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedWallet.walletAddress, 'XRP wallet address')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label className="flex items-center">
                <Key className="mr-1 h-4 w-4" />
                Public Key
              </Label>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {generatedWallet.publicKey}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generatedWallet.publicKey, 'XRP public key')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Private Key */}
            {generatedWallet.privateKey && (
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Shield className="mr-1 h-4 w-4" />
                  Private Key (Seed)
                </Label>
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
                    onClick={() => copyToClipboard(generatedWallet.privateKey!, 'XRP private key')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Mnemonic Phrase */}
            {generatedWallet.mnemonic && (
              <div className="space-y-2">
                <Label className="flex items-center">
                  <Key className="mr-1 h-4 w-4" />
                  Mnemonic Phrase
                </Label>
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
                    onClick={() => copyToClipboard(generatedWallet.mnemonic!, 'XRP mnemonic phrase')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Vault Information */}
            <div className="space-y-2">
              <Label>Vault Information</Label>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {generatedWallet.privateKeyVaultId && (
                  <div>
                    <span className="text-muted-foreground">Private Key Vault ID:</span>
                    <p className="font-mono text-xs break-all">{generatedWallet.privateKeyVaultId}</p>
                  </div>
                )}
                {generatedWallet.mnemonicVaultId && (
                  <div>
                    <span className="text-muted-foreground">Mnemonic Vault ID:</span>
                    <p className="font-mono text-xs break-all">{generatedWallet.mnemonicVaultId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Security Warning */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Security Notice:</strong> The private key and mnemonic phrase are shown here for immediate use. 
                They are securely stored in the vault and encrypted. Never share these credentials with unauthorized parties.
                {(generatedWallet.privateKeyVaultId || generatedWallet.mnemonicVaultId) 
                  ? " Private keys are backed up in secure vault storage."
                  : " Consider enabling vault storage for enhanced security."
                }
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default XRPLProjectWalletGenerator
