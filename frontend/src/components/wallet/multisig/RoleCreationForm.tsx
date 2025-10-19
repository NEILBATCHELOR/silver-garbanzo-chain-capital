/**
 * Role Creation Form
 * Creates new roles with blockchain addresses for multi-sig wallet ownership
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Key, Copy, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/infrastructure/database/client';
import { roleAddressService } from '@/services/wallet/multiSig/RoleAddressService';

interface RoleCreationFormProps {
  onSuccess?: (roleId: string, roleName: string) => void;
  onCancel?: () => void;
  defaultBlockchain?: string;
}

export function RoleCreationForm({ 
  onSuccess, 
  onCancel, 
  defaultBlockchain = 'ethereum' 
}: RoleCreationFormProps) {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('5');
  const [blockchain, setBlockchain] = useState(defaultBlockchain);
  const [generateAddress, setGenerateAddress] = useState(true);
  
  // Address generation state
  const [generatedAddress, setGeneratedAddress] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAddress = async () => {
    if (!name) {
      toast({
        title: 'Error',
        description: 'Please enter a role name first',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingAddress(true);
    setError(null);

    try {
      // Create temporary role to get ID (we'll use this for key reference)
      const tempRoleId = `temp_${Date.now()}`;
      
      // Generate address via service (will store in KeyVault)
      const roleAddress = await roleAddressService.generateRoleAddress({
        roleId: tempRoleId,
        blockchain,
        // contractRoles undefined = inherit all roles from role_contracts
        signingMethod: 'private_key'
      });

      setGeneratedAddress(roleAddress.address);
      
      // Get private key for display (one-time) - use address ID not role ID
      const pk = await roleAddressService.getRolePrivateKey(roleAddress.id);
      if (pk) {
        setPrivateKey(pk);
      }

      toast({
        title: 'Success!',
        description: 'Address generated and encrypted',
      });

    } catch (err: any) {
      console.error('Failed to generate address:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to generate address',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingAddress(false);
    }
  };

  const handleCreateRole = async () => {
    if (!name || !description) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (generateAddress && !generatedAddress) {
      toast({
        title: 'Error',
        description: 'Please generate an address first',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // 1. Create role in database
      const { data: roleData, error: roleError } = await supabase
        .from('roles')
        .insert({
          name,
          description,
          priority: parseInt(priority)
        })
        .select()
        .single();

      if (roleError) throw roleError;

      // 2. If address was generated, associate it with the role
      if (generateAddress && generatedAddress && privateKey) {
        await roleAddressService.generateRoleAddress({
          roleId: roleData.id,
          blockchain,
          // contractRoles undefined = inherit all roles from role_contracts
          signingMethod: 'private_key',
          existingAddress: generatedAddress,
          existingPrivateKey: privateKey
        });
      }

      toast({
        title: 'Success!',
        description: `Role "${name}" created successfully`,
      });

      onSuccess?.(roleData.id, roleData.name);

    } catch (err: any) {
      console.error('Failed to create role:', err);
      setError(err.message);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create role',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="mr-2 h-5 w-5" />
          Create Role with Address
        </CardTitle>
        <CardDescription>
          Create a new role and optionally generate a blockchain address for signing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Details */}
        <div className="space-y-2">
          <Label htmlFor="name">Role Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Treasury Manager"
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role's responsibilities..."
            rows={3}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Higher priority roles appear first (1-10)
          </p>
        </div>

        {/* Blockchain Selection */}
        <div className="space-y-2">
          <Label htmlFor="blockchain">Blockchain *</Label>
          <Select 
            value={blockchain} 
            onValueChange={setBlockchain}
            disabled={isCreating || !!generatedAddress}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select blockchain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="holesky">Holesky (Testnet)</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="arbitrum">Arbitrum</SelectItem>
              <SelectItem value="optimism">Optimism</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Address Generation Section */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label>Signing Address</Label>
            <Badge variant="outline" className="text-xs">
              {generateAddress ? 'Auto-Generate' : 'Skip'}
            </Badge>
          </div>

          {!generatedAddress ? (
            <Button
              onClick={handleGenerateAddress}
              disabled={isGeneratingAddress || isCreating || !name}
              variant="outline"
              className="w-full"
            >
              {isGeneratingAddress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Generate Blockchain Address
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3 p-3 border rounded-md bg-muted/20">
              {/* Generated Address */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center">
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                    Address
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedAddress, 'Address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <code className="text-xs font-mono block p-2 bg-background rounded">
                  {generatedAddress}
                </code>
              </div>

              {/* Private Key (show/hide) */}
              {privateKey && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-destructive">
                      Private Key (save securely!)
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                      >
                        {showPrivateKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      {showPrivateKey && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(privateKey, 'Private Key')}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {showPrivateKey ? (
                    <code className="text-xs font-mono block p-2 bg-destructive/10 rounded break-all">
                      {privateKey}
                    </code>
                  ) : (
                    <div className="p-2 bg-destructive/10 rounded text-xs text-muted-foreground">
                      Click the eye icon to reveal
                    </div>
                  )}
                </div>
              )}

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Important:</strong> Save the private key securely. It's encrypted in our
                  system but you should keep a backup. This is your only chance to view it.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCreating}
            >
              Cancel
            </Button>
          )}
          <Button
            type="button"
            onClick={handleCreateRole}
            disabled={isCreating || !name || !description}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Role
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default RoleCreationForm;
