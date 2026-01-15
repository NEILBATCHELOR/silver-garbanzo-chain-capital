import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Loader2, Settings, Save, AlertTriangle, Copy } from 'lucide-react'
import { xrplClientManager } from '@/services/wallet/ripple/core/XRPLClientManager'
import type { Wallet, AccountSet } from 'xrpl'

interface WalletSettingsProps {
  wallet: Wallet
  network?: 'MAINNET' | 'TESTNET' | 'DEVNET'
}

interface AccountFlags {
  requireDestTag: boolean
  requireAuth: boolean
  disallowXRP: boolean
  defaultRipple: boolean
  globalFreeze: boolean
  noFreeze: boolean
}

export const WalletSettings: React.FC<WalletSettingsProps> = ({
  wallet,
  network = 'TESTNET'
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [domain, setDomain] = useState('')
  const [emailHash, setEmailHash] = useState('')
  const [messageKey, setMessageKey] = useState('')
  const [transferRate, setTransferRate] = useState('')
  const [tickSize, setTickSize] = useState('')
  
  const [flags, setFlags] = useState<AccountFlags>({
    requireDestTag: false,
    requireAuth: false,
    disallowXRP: false,
    defaultRipple: false,
    globalFreeze: false,
    noFreeze: false
  })

  useEffect(() => {
    loadAccountSettings()
  }, [wallet.address, network])

  const loadAccountSettings = async () => {
    setLoading(true)
    try {
      const client = await xrplClientManager.getClient(network)

      const response = await client.request({
        command: 'account_info',
        account: wallet.address,
        ledger_index: 'validated'
      })

      const account = response.result.account_data

      // Parse domain
      if (account.Domain) {
        setDomain(Buffer.from(account.Domain, 'hex').toString('utf8'))
      }

      // Parse email hash
      if (account.EmailHash) {
        setEmailHash(account.EmailHash)
      }

      // Parse message key
      if (account.MessageKey) {
        setMessageKey(account.MessageKey)
      }

      // Parse transfer rate
      if (account.TransferRate) {
        setTransferRate(account.TransferRate.toString())
      }

      // Parse tick size
      if (account.TickSize) {
        setTickSize(account.TickSize.toString())
      }

      // Parse flags
      const accountFlags = account.Flags
      setFlags({
        requireDestTag: !!(accountFlags & 0x00020000),
        requireAuth: !!(accountFlags & 0x00040000),
        disallowXRP: !!(accountFlags & 0x00080000),
        defaultRipple: !!(accountFlags & 0x00800000),
        globalFreeze: !!(accountFlags & 0x00400000),
        noFreeze: !!(accountFlags & 0x00200000)
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const client = await xrplClientManager.getClient(network)

      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: wallet.address,
        Domain: domain ? Buffer.from(domain).toString('hex') : undefined,
        EmailHash: emailHash || undefined,
        MessageKey: messageKey || undefined,
        TransferRate: transferRate ? parseInt(transferRate) : undefined,
        TickSize: tickSize ? parseInt(tickSize) : undefined
      }

      const response = await client.submitAndWait(tx, {
        wallet,
        autofill: true
      })

      const meta = response.result.meta
      const isSuccess = typeof meta === 'object' && 'TransactionResult' in meta 
        ? meta.TransactionResult === 'tesSUCCESS'
        : false

      if (isSuccess) {
        toast({
          title: 'Settings Updated',
          description: 'Account settings have been saved successfully'
        })
      } else {
        const errorMsg = typeof meta === 'object' && 'TransactionResult' in meta 
          ? meta.TransactionResult 
          : 'Failed to save settings'
        throw new Error(errorMsg)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleFlag = async (flag: keyof AccountFlags) => {
    setSaving(true)
    try {
      const client = await xrplClientManager.getClient(network)

      // Map of flag names to their set/clear flag values
      const flagMap = {
        requireDestTag: { set: 1, clear: 0 },
        requireAuth: { set: 2, clear: 1 },
        disallowXRP: { set: 3, clear: 2 },
        defaultRipple: { set: 8, clear: 7 },
        globalFreeze: { set: 7, clear: 6 },
        noFreeze: { set: 6, clear: 5 }
      }

      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: wallet.address
      }

      if (flags[flag]) {
        // Clear flag
        tx.ClearFlag = flagMap[flag].clear
      } else {
        // Set flag
        tx.SetFlag = flagMap[flag].set
      }

      const response = await client.submitAndWait(tx, {
        wallet,
        autofill: true
      })

      const meta = response.result.meta
      const isSuccess = typeof meta === 'object' && 'TransactionResult' in meta 
        ? meta.TransactionResult === 'tesSUCCESS'
        : false

      if (isSuccess) {
        setFlags(prev => ({ ...prev, [flag]: !prev[flag] }))
        toast({
          title: 'Flag Updated',
          description: `${flag} has been ${flags[flag] ? 'disabled' : 'enabled'}`
        })
      } else {
        const errorMsg = typeof meta === 'object' && 'TransactionResult' in meta 
          ? meta.TransactionResult 
          : 'Failed to update flag'
        throw new Error(errorMsg)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update flag',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const copySeed = async () => {
    if (!wallet.seed) {
      toast({
        title: 'Error',
        description: 'Seed not available',
        variant: 'destructive'
      })
      return
    }

    await navigator.clipboard.writeText(wallet.seed)
    toast({
      title: 'Copied',
      description: 'Wallet seed copied to clipboard. Keep it secure!',
      variant: 'default'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Wallet Settings
        </CardTitle>
        <CardDescription>Configure your XRPL account settings and flags</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Account Information</h3>

          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your website or organization domain
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferRate">Transfer Rate</Label>
            <Input
              id="transferRate"
              type="number"
              placeholder="1000000000"
              value={transferRate}
              onChange={(e) => setTransferRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Fee charged when others transfer your issued tokens (0-50%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tickSize">Tick Size</Label>
            <Input
              id="tickSize"
              type="number"
              placeholder="5"
              value={tickSize}
              onChange={(e) => setTickSize(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Number of significant digits for exchange rates (3-15)
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Account Settings
              </>
            )}
          </Button>
        </div>

        {/* Account Flags */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Account Flags</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Destination Tag</Label>
                <p className="text-xs text-muted-foreground">
                  Require destination tag on incoming payments
                </p>
              </div>
              <Switch
                checked={flags.requireDestTag}
                onCheckedChange={() => handleToggleFlag('requireDestTag')}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Require Authorization</Label>
                <p className="text-xs text-muted-foreground">
                  Require authorization for trust lines
                </p>
              </div>
              <Switch
                checked={flags.requireAuth}
                onCheckedChange={() => handleToggleFlag('requireAuth')}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Disallow XRP</Label>
                <p className="text-xs text-muted-foreground">
                  Block incoming XRP payments
                </p>
              </div>
              <Switch
                checked={flags.disallowXRP}
                onCheckedChange={() => handleToggleFlag('disallowXRP')}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Default Ripple</Label>
                <p className="text-xs text-muted-foreground">
                  Enable rippling on trust lines by default
                </p>
              </div>
              <Switch
                checked={flags.defaultRipple}
                onCheckedChange={() => handleToggleFlag('defaultRipple')}
                disabled={saving}
              />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Security
          </h3>

          <div className="p-4 bg-red-50 rounded-lg space-y-3">
            <p className="text-sm text-red-800">
              ⚠️ <strong>Warning:</strong> Never share your wallet seed with anyone!
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={copySeed}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Wallet Seed (Keep Secure!)
            </Button>
          </div>
        </div>

        {/* Network Info */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Network</span>
            <Badge>{network}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
