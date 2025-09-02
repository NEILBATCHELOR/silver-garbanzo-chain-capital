/**
 * SignatureMigrationFlow - Signature Scheme Migration Interface
 * 
 * Handles migration between ECDSA (secp256k1) and WebAuthn (secp256r1) signature schemes
 * with guardian approval workflow and time-delayed security
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { 
  Key, 
  Smartphone,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Users,
  Fingerprint
} from 'lucide-react'
import { UnifiedWallet } from '@/services/wallet/smart-contract/unifiedWalletService'

interface SignatureMigrationFlowProps {
  walletId: string
  wallet: UnifiedWallet
}

interface MigrationStatus {
  id: string
  fromScheme: 'secp256k1' | 'secp256r1'
  toScheme: 'secp256k1' | 'secp256r1'
  status: 'pending' | 'guardian_approval' | 'security_period' | 'ready' | 'completed' | 'cancelled'
  securityPeriodEnd?: string
  approvals: {
    guardianAddress: string
    approved: boolean
    timestamp?: string
  }[]
  createdAt: string
}

interface WebAuthnCredential {
  credentialId: string
  publicKey: string
  authenticatorData: string
}

export function SignatureMigrationFlow({ walletId, wallet }: SignatureMigrationFlowProps) {
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [webAuthnAvailable, setWebAuthnAvailable] = useState(false)
  const [migrationStep, setMigrationStep] = useState<'select' | 'webauthn' | 'confirm' | 'progress'>('select')
  const { toast } = useToast()

  useEffect(() => {
    checkWebAuthnAvailability()
    loadMigrationStatus()
  }, [walletId])

  const checkWebAuthnAvailability = () => {
    const available = window.PublicKeyCredential && 
                     navigator.credentials && 
                     navigator.credentials.create &&
                     window.isSecureContext
    setWebAuthnAvailable(available)
  }

  const loadMigrationStatus = async () => {
    try {
      setLoading(true)
      // In real implementation, this would fetch from the backend
      // For now, simulate based on wallet state
      if (wallet.security.currentSignatureScheme === 'both') {
        // Migration already completed
        setMigrationStatus({
          id: 'completed-migration',
          fromScheme: 'secp256k1',
          toScheme: 'secp256r1',
          status: 'completed',
          approvals: [],
          createdAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Failed to load migration status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartMigration = async (targetScheme: 'secp256k1' | 'secp256r1') => {
    try {
      setLoading(true)
      
      if (targetScheme === 'secp256r1') {
        // Moving to WebAuthn - need to create credential first
        setMigrationStep('webauthn')
      } else {
        // Moving to ECDSA - direct migration
        setMigrationStep('confirm')
      }
    } catch (error) {
      console.error('Failed to start migration:', error)
      toast({
        title: 'Migration Failed',
        description: 'Failed to start signature migration',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWebAuthnCredential = async () => {
    if (!webAuthnAvailable) {
      toast({
        title: 'WebAuthn Not Available',
        description: 'WebAuthn is not supported on this device or browser',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // Create WebAuthn credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: 'Chain Capital',
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(walletId),
            name: `Wallet ${walletId.slice(0, 8)}`,
            displayName: wallet.name,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256 (secp256r1)
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
        },
      }) as PublicKeyCredential

      if (credential) {
        setMigrationStep('confirm')
        toast({
          title: 'WebAuthn Credential Created',
          description: 'Successfully created biometric authentication credential',
        })
      }
    } catch (error) {
      console.error('WebAuthn credential creation failed:', error)
      toast({
        title: 'WebAuthn Failed',
        description: 'Failed to create biometric authentication credential',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmMigration = async () => {
    try {
      setLoading(true)
      
      // Simulate migration initiation
      const newMigration: MigrationStatus = {
        id: `migration-${Date.now()}`,
        fromScheme: wallet.security.currentSignatureScheme as 'secp256k1' | 'secp256r1',
        toScheme: migrationStep === 'webauthn' ? 'secp256r1' : 'secp256k1',
        status: wallet.security.guardianCount > 0 ? 'guardian_approval' : 'security_period',
        securityPeriodEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        approvals: wallet.security.guardianCount > 0 ? 
          Array(wallet.security.guardianCount).fill(null).map((_, i) => ({
            guardianAddress: `0x${i.toString().padStart(40, '0')}`,
            approved: false
          })) : [],
        createdAt: new Date().toISOString()
      }

      setMigrationStatus(newMigration)
      setMigrationStep('progress')
      
      toast({
        title: 'Migration Initiated',
        description: wallet.security.guardianCount > 0 
          ? 'Waiting for guardian approvals'
          : 'Security period started - migration will complete in 24 hours',
      })
    } catch (error) {
      console.error('Failed to confirm migration:', error)
      toast({
        title: 'Migration Failed',
        description: 'Failed to confirm signature migration',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelMigration = async () => {
    try {
      setLoading(true)
      setMigrationStatus(null)
      setMigrationStep('select')
      
      toast({
        title: 'Migration Cancelled',
        description: 'Signature migration has been cancelled',
      })
    } catch (error) {
      console.error('Failed to cancel migration:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSchemeIcon = (scheme: 'secp256k1' | 'secp256r1') => {
    return scheme === 'secp256r1' ? (
      <Smartphone className="w-5 h-5 text-blue-600" />
    ) : (
      <Key className="w-5 h-5 text-gray-600" />
    )
  }

  const getSchemeLabel = (scheme: 'secp256k1' | 'secp256r1') => {
    return scheme === 'secp256r1' ? 'WebAuthn/Passkeys' : 'Traditional ECDSA'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'ready':
        return 'bg-blue-100 text-blue-800'
      case 'security_period':
      case 'guardian_approval':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderMigrationProgress = () => {
    if (!migrationStatus) return null

    const approvalCount = migrationStatus.approvals.filter(a => a.approved).length
    const totalApprovals = migrationStatus.approvals.length
    const approvalProgress = totalApprovals > 0 ? (approvalCount / totalApprovals) * 100 : 0

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Migration Progress
          </CardTitle>
          <CardDescription>
            Migrating from {getSchemeLabel(migrationStatus.fromScheme)} to {getSchemeLabel(migrationStatus.toScheme)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSchemeIcon(migrationStatus.fromScheme)}
              <span className="text-sm">{getSchemeLabel(migrationStatus.fromScheme)}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              {getSchemeIcon(migrationStatus.toScheme)}
              <span className="text-sm">{getSchemeLabel(migrationStatus.toScheme)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Status</span>
              <Badge className={getStatusColor(migrationStatus.status)}>
                {migrationStatus.status.replace('_', ' ')}
              </Badge>
            </div>

            {migrationStatus.status === 'guardian_approval' && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span>Guardian Approvals</span>
                  <span>{approvalCount}/{totalApprovals}</span>
                </div>
                <Progress value={approvalProgress} className="h-2" />
              </>
            )}

            {migrationStatus.securityPeriodEnd && (
              <div className="flex items-center justify-between text-sm">
                <span>Security Period Ends</span>
                <span>{new Date(migrationStatus.securityPeriodEnd).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCancelMigration}
              variant="outline"
              size="sm"
              disabled={loading || migrationStatus.status === 'completed'}
            >
              Cancel Migration
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Signature Scheme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getSchemeIcon(wallet.security.currentSignatureScheme as 'secp256k1' | 'secp256r1')}
            Current Signature Scheme
          </CardTitle>
          <CardDescription>
            Your wallet currently uses {getSchemeLabel(wallet.security.currentSignatureScheme as 'secp256k1' | 'secp256r1')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getSchemeIcon(wallet.security.currentSignatureScheme as 'secp256k1' | 'secp256r1')}
              <div>
                <p className="font-medium">{getSchemeLabel(wallet.security.currentSignatureScheme as 'secp256k1' | 'secp256r1')}</p>
                <p className="text-sm text-muted-foreground">
                  {wallet.security.currentSignatureScheme === 'secp256r1' 
                    ? 'Biometric authentication with Touch ID, Face ID, or Windows Hello'
                    : 'Traditional cryptographic signatures using private keys'
                  }
                </p>
              </div>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress (if active) */}
      {migrationStatus && migrationStep === 'progress' && renderMigrationProgress()}

      {/* Migration Options */}
      {!migrationStatus && migrationStep === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Signature Migration</CardTitle>
            <CardDescription>
              Migrate to a different signature scheme for enhanced security or compatibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WebAuthn Migration Option */}
            {wallet.security.currentSignatureScheme !== 'secp256r1' && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">Migrate to WebAuthn/Passkeys</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use biometric authentication (Touch ID, Face ID, Windows Hello) for enhanced security
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Fingerprint className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">More secure</span>
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-blue-600">Better UX</span>
                    </div>
                    <Button
                      onClick={() => handleStartMigration('secp256r1')}
                      disabled={!webAuthnAvailable || loading}
                      className="mt-3"
                      size="sm"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-4 h-4 mr-2" />
                          Enable WebAuthn
                        </>
                      )}
                    </Button>
                    {!webAuthnAvailable && (
                      <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          WebAuthn is not available on this device or browser. Please use a modern browser with biometric authentication support.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ECDSA Migration Option */}
            {wallet.security.currentSignatureScheme !== 'secp256k1' && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-gray-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium">Migrate to Traditional ECDSA</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use traditional cryptographic signatures for maximum compatibility
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Shield className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Universal compatibility</span>
                    </div>
                    <Button
                      onClick={() => handleStartMigration('secp256k1')}
                      disabled={loading}
                      variant="outline"
                      className="mt-3"
                      size="sm"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4 mr-2" />
                          Use ECDSA
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WebAuthn Setup Step */}
      {migrationStep === 'webauthn' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Set Up WebAuthn Authentication
            </CardTitle>
            <CardDescription>
              Create a biometric authentication credential for your wallet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <Fingerprint className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium mb-2">Create Biometric Credential</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You'll be prompted to use your device's biometric authentication (Touch ID, Face ID, Windows Hello)
              </p>
              <Button onClick={handleCreateWebAuthnCredential} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 mr-2" />
                    Create Credential
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Step */}
      {migrationStep === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Migration</CardTitle>
            <CardDescription>
              Review the migration details before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {wallet.security.guardianCount > 0 
                  ? `This migration requires approval from ${wallet.security.guardianCount} guardian(s) and a 24-hour security period.`
                  : 'This migration will be processed after a 24-hour security period.'
                }
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button onClick={handleConfirmMigration} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm Migration
                  </>
                )}
              </Button>
              <Button onClick={() => setMigrationStep('select')} variant="outline">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
