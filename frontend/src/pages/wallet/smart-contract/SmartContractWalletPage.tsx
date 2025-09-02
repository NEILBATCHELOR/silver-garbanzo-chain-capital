/**
 * SmartContractWalletPage - Main Smart Contract Wallet Management Page
 * 
 * Comprehensive page for managing smart contract wallets with:
 * - Unified wallet interface
 * - Traditional to smart contract upgrades
 * - WebAuthn integration
 * - Guardian recovery
 * - Emergency lock controls
 * - Restriction management
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { 
  CircuitBoard, 
  ArrowLeft,
  Wallet,
  Shield,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap
} from 'lucide-react'
import { UnifiedWalletDashboard } from '@/components/wallet/components/smart-contract'
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity } from '@/services/activity'

interface SmartContractWalletPageProps {
  // Optional props if needed
}

export default function SmartContractWalletPage({}: SmartContractWalletPageProps) {
  const { walletId } = useParams<{ walletId?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [selectedWalletId, setSelectedWalletId] = useState<string | undefined>(walletId)

  useEffect(() => {
    // Log page access
    enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: 'smart_contract_wallet_page_accessed',
      entityType: 'wallet_page',
      entityId: walletId || 'all_wallets',
      details: 'User accessed smart contract wallet management page',
      category: ActivityCategory.USER_MANAGEMENT,
      severity: ActivitySeverity.INFO
    })
  }, [walletId])

  const handleWalletSelect = (newWalletId: string) => {
    setSelectedWalletId(newWalletId)
    // Update URL without causing full navigation
    window.history.replaceState(null, '', `/wallet/smart-contract/${newWalletId}`)
    
    // Log wallet selection
    enhancedActivityService.logActivity({
      source: ActivitySource.USER,
      action: 'wallet_selected',
      entityType: 'wallet',
      entityId: newWalletId,
      details: 'User selected wallet in smart contract interface',
      category: ActivityCategory.USER_MANAGEMENT,
      severity: ActivitySeverity.INFO
    })
  }

  const handleBackToWallets = () => {
    navigate('/wallet')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleBackToWallets}
            variant="ghost"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Wallets
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CircuitBoard className="w-8 h-8 text-blue-600" />
              Smart Contract Wallets
            </h1>
            <p className="text-muted-foreground">
              Advanced wallet management with smart contract capabilities
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Zap className="w-3 h-3 mr-1" />
            Phase 3D Complete
          </Badge>
        </div>
      </div>

      {/* Feature Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CircuitBoard className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Smart Contracts</p>
                <p className="text-xs text-blue-700">Diamond proxy architecture</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-green-900">WebAuthn</p>
                <p className="text-xs text-green-700">Biometric authentication</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-medium text-purple-900">Gasless Txns</p>
                <p className="text-xs text-purple-700">Account abstraction</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-900">Restrictions</p>
                <p className="text-xs text-orange-700">Compliance rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Smart Contract Wallets</strong> provide advanced features like WebAuthn authentication, 
          gasless transactions, guardian recovery, and compliance restrictions. Traditional wallets can be 
          seamlessly upgraded to smart contract wallets with enhanced security and functionality.
        </AlertDescription>
      </Alert>

      {/* Main Dashboard Component */}
      <UnifiedWalletDashboard 
        walletId={selectedWalletId}
        onWalletSelect={handleWalletSelect}
      />

      {/* Educational Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Smart Contract Wallet Features
          </CardTitle>
          <CardDescription>
            Learn about the advanced capabilities available with smart contract wallets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <CircuitBoard className="w-4 h-4 text-blue-600" />
                  Diamond Proxy Architecture
                </h4>
                <p className="text-sm text-muted-foreground">
                  Modular smart contract design (EIP-2535) that allows for upgradeable functionality 
                  without changing the wallet address. Add new features as facets without migration.
                </p>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  WebAuthn Integration
                </h4>
                <p className="text-sm text-muted-foreground">
                  Use your device's biometric authentication (Touch ID, Face ID, Windows Hello) to 
                  sign transactions securely with secp256r1 signatures.
                </p>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  Account Abstraction
                </h4>
                <p className="text-sm text-muted-foreground">
                  EIP-4337 support enables gasless transactions, batch operations, and improved user 
                  experience through paymaster sponsorship.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-gray-600" />
                  Signature Migration
                </h4>
                <p className="text-sm text-muted-foreground">
                  Seamlessly migrate between ECDSA and WebAuthn signature schemes with guardian 
                  approval and time-delayed security periods.
                </p>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Compliance Restrictions
                </h4>
                <p className="text-sm text-muted-foreground">
                  Configure transaction restrictions including address whitelisting, amount limits, 
                  time-based restrictions, and custom compliance rules.
                </p>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  Emergency Controls
                </h4>
                <p className="text-sm text-muted-foreground">
                  Emergency lock/unlock capabilities with guardian recovery, time-based unlocks, 
                  and comprehensive security event logging.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
