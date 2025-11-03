/**
 * Module Management Panel
 * Manages extension module attachments for deployed tokens
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, Check, X, ChevronRight, Loader2, Plug, PlugZap, Unplug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCryptoOperationGateway } from '@/infrastructure/gateway/hooks/useCryptoOperationGateway';
import { useTransactionValidation } from '@/infrastructure/validation/hooks/PreTransactionHooks';
import type { SupportedChain } from '@/infrastructure/web3/adapters/IBlockchainAdapter';
import { useSupabaseClient as useSupabase } from '@/hooks/shared/supabase/useSupabaseClient';
import { ModuleRegistryService } from '@/services/modules/ModuleRegistryService';
import { ethers } from 'ethers';

interface ModuleManagementPanelProps {
  tokenId: string;
  tokenAddress: string;
  tokenStandard: string;
  chain: SupportedChain;
  isDeployed: boolean;
  onSuccess?: () => void;
}

type ModuleType = 'compliance' | 'vesting' | 'fees' | 'policyEngine';

interface ModuleInfo {
  type: ModuleType;
  label: string;
  description: string;
  setterFunction: string;
  getterFunction: string;
  dbColumn: string;
}

const MODULE_INFO: Record<ModuleType, ModuleInfo> = {
  compliance: {
    type: 'compliance',
    label: 'Compliance Module',
    description: 'KYC/AML checks and whitelist management',
    setterFunction: 'setComplianceModule',
    getterFunction: 'complianceModule',
    dbColumn: 'compliance_module_address'
  },
  vesting: {
    type: 'vesting',
    label: 'Vesting Module',
    description: 'Token lock schedules and cliff periods',
    setterFunction: 'setVestingModule',
    getterFunction: 'vestingModule',
    dbColumn: 'vesting_module_address'
  },
  fees: {
    type: 'fees',
    label: 'Fees Module',
    description: 'Transfer fees and revenue generation',
    setterFunction: 'setFeesModule',
    getterFunction: 'feesModule',
    dbColumn: 'fees_module_address'
  },
  policyEngine: {
    type: 'policyEngine',
    label: 'Policy Engine',
    description: 'On-chain policy enforcement for operations',
    setterFunction: 'setPolicyEngine',
    getterFunction: 'policyEngine',
    dbColumn: 'policy_engine_address'
  }
};

export const ModuleManagementPanel: React.FC<ModuleManagementPanelProps> = ({
  tokenId,
  tokenAddress,
  tokenStandard,
  chain,
  isDeployed,
  onSuccess
}) => {
  // Services
  const { supabase } = useSupabase();
  // ModuleRegistryService is a static class, no getInstance needed
  
  // State
  const [selectedModuleType, setSelectedModuleType] = useState<ModuleType>('compliance');
  const [action, setAction] = useState<'attach' | 'detach'>('attach');
  const [moduleAddress, setModuleAddress] = useState('');
  const [currentModules, setCurrentModules] = useState<Record<ModuleType, string | null>>({
    compliance: null,
    vesting: null,
    fees: null,
    policyEngine: null
  });
  const [availableModules, setAvailableModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  
  // UI state
  const [executionStep, setExecutionStep] = useState<'input' | 'validation' | 'execution' | 'complete'>('input');
  
  // Hooks
  const { operations, loading: gatewayLoading, error: gatewayError } = useCryptoOperationGateway({
    onSuccess: (result) => {
      setExecutionStep('complete');
      onSuccess?.();
      loadCurrentModules(); // Refresh modules
    }
  });
  
  const { validateTransaction, validationResult, validating } = useTransactionValidation();

  // Load current modules on mount
  useEffect(() => {
    if (isDeployed && tokenAddress) {
      loadCurrentModules();
    }
  }, [isDeployed, tokenAddress]);

  // Load available modules when type changes
  useEffect(() => {
    loadAvailableModules();
  }, [selectedModuleType]);

  const loadCurrentModules = async () => {
    try {
      // Load from database first (faster)
      const propertiesTable = `token_${tokenStandard.toLowerCase().replace('-', '')}_properties`;
      
      const { data, error } = await supabase
        .from(propertiesTable)
        .select('*')
        .eq('token_id', tokenId)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentModules({
          compliance: data.compliance_module_address || null,
          vesting: data.vesting_module_address || null,
          fees: data.fees_module_address || null,
          policyEngine: data.policy_engine_address || null
        });
      }

      // TODO: Optionally verify on-chain by calling getter functions
      // This would require ethers.js contract calls
      
    } catch (error) {
      console.error('Failed to load current modules:', error);
    }
  };

  const loadAvailableModules = async () => {
    setLoadingModules(true);
    try {
      // ModuleRegistryService is a static class - call methods directly
      const availableModules = await ModuleRegistryService.getAvailableModules(
        chain,
        'testnet' // TODO: determine from chain
      );
      
      // Filter for the specific module type we need
      const modulesArray = Array.from(availableModules.values()).filter(m => 
        m.contractType.toLowerCase().includes(selectedModuleType.toLowerCase())
      );
      
      setAvailableModules(modulesArray);
    } catch (error) {
      console.error('Failed to load available modules:', error);
      setAvailableModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  const validateModuleAddress = async (address: string): Promise<boolean> => {
    if (!address || address === ethers.ZeroAddress) {
      return action === 'detach'; // Valid for detach only
    }

    setValidatingAddress(true);
    try {
      // Validate it's a valid address
      if (!ethers.isAddress(address)) {
        return false;
      }

      // TODO: Optionally verify the module implements correct interface
      // This would require calling supportsInterface on the module
      
      return true;
    } catch (error) {
      console.error('Address validation failed:', error);
      return false;
    } finally {
      setValidatingAddress(false);
    }
  };

  const validateInput = (): boolean => {
    if (!isDeployed) return false;
    
    if (action === 'attach') {
      return !!moduleAddress && ethers.isAddress(moduleAddress);
    } else {
      // For detach, must have a module currently attached
      return !!currentModules[selectedModuleType];
    }
  };

  // Handle pre-transaction validation
  const handleValidate = async () => {
    setExecutionStep('validation');
    
    const addressToUse = action === 'detach' ? ethers.ZeroAddress : moduleAddress;
    
    const transaction = {
      id: `temp-${Date.now()}`,
      walletId: window.ethereum?.selectedAddress || '',
      to: tokenAddress,
      from: window.ethereum?.selectedAddress || '',
      data: '0x', // Will be built by gateway
      value: '0',
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      metadata: {
        operation: {
          type: 'setModule',
          moduleType: selectedModuleType,
          moduleAddress: addressToUse
        }
      }
    };

    await validateTransaction(transaction, {
      urgency: 'standard',
      simulate: true
    });
  };

  // Handle execution
  const handleExecute = async () => {
    if (!validationResult?.valid) return;

    setExecutionStep('execution');
    
    try {
      const addressToUse = action === 'detach' ? ethers.ZeroAddress : moduleAddress;
      const moduleInfo = MODULE_INFO[selectedModuleType];
      
      // Call the appropriate setter function
      await operations.setModule(
        tokenAddress,
        moduleInfo.setterFunction,
        addressToUse,
        chain
      );
      
      // Update database
      const propertiesTable = `token_${tokenStandard.toLowerCase().replace('-', '')}_properties`;
      
      await supabase
        .from(propertiesTable)
        .update({
          [moduleInfo.dbColumn]: action === 'detach' ? null : addressToUse,
          updated_at: new Date().toISOString()
        })
        .eq('token_id', tokenId);

      // Log to token_modules table
      if (action === 'attach') {
        await supabase.from('token_modules').insert({
          token_id: tokenId,
          module_type: selectedModuleType,
          module_address: addressToUse,
          module_config: null,
          is_active: true
        });
      } else {
        // Mark as inactive
        await supabase
          .from('token_modules')
          .update({ is_active: false })
          .eq('token_id', tokenId)
          .eq('module_type', selectedModuleType)
          .eq('module_address', currentModules[selectedModuleType]);
      }
      
    } catch (error) {
      console.error('Module management operation failed:', error);
      setExecutionStep('validation');
    }
  };

  // Reset form
  const handleReset = () => {
    setModuleAddress('');
    setAction('attach');
    setExecutionStep('input');
  };

  const getModuleStatusBadge = (moduleType: ModuleType) => {
    const address = currentModules[moduleType];
    if (!address || address === ethers.ZeroAddress) {
      return <Badge variant="outline" className="bg-gray-100">Not Attached</Badge>;
    }
    return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Extension Module Management
          </CardTitle>
          <CardDescription>
            Attach or detach extension modules for enhanced token functionality
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={executionStep} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="input">Input</TabsTrigger>
              <TabsTrigger value="validation" disabled={executionStep === 'input'}>
                Validation
              </TabsTrigger>
              <TabsTrigger value="execution" disabled={executionStep !== 'execution'}>
                Execution
              </TabsTrigger>
              <TabsTrigger value="complete" disabled={executionStep !== 'complete'}>
                Complete
              </TabsTrigger>
            </TabsList>

            {/* STEP 1: Input */}
            <TabsContent value="input" className="space-y-4 mt-4">
              {/* Current Modules Overview */}
              <div className="space-y-2">
                <Label>Currently Attached Modules</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(MODULE_INFO) as ModuleType[]).map(type => {
                    const info = MODULE_INFO[type];
                    const address = currentModules[type];
                    return (
                      <div key={type} className="p-3 border rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{info.label}</span>
                          {getModuleStatusBadge(type)}
                        </div>
                        {address && address !== ethers.ZeroAddress && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {address.slice(0, 10)}...{address.slice(-8)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Selection */}
              <div className="space-y-2">
                <Label>Action</Label>
                <Select value={action} onValueChange={(v) => setAction(v as 'attach' | 'detach')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attach">
                      <div className="flex items-center gap-2">
                        <Plug className="h-4 w-4" />
                        Attach Module
                      </div>
                    </SelectItem>
                    <SelectItem value="detach">
                      <div className="flex items-center gap-2">
                        <Unplug className="h-4 w-4" />
                        Detach Module
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Module Type Selection */}
              <div className="space-y-2">
                <Label>Module Type</Label>
                <Select 
                  value={selectedModuleType} 
                  onValueChange={(v) => setSelectedModuleType(v as ModuleType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODULE_INFO) as ModuleType[]).map(type => {
                      const info = MODULE_INFO[type];
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex flex-col">
                            <span className="font-medium">{info.label}</span>
                            <span className="text-xs text-muted-foreground">{info.description}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Module Address Selection (for attach only) */}
              {action === 'attach' && (
                <div className="space-y-2">
                  <Label>Module Address</Label>
                  
                  {/* Available Modules */}
                  {loadingModules ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading available modules...
                    </div>
                  ) : availableModules.length > 0 ? (
                    <Select
                      value={moduleAddress}
                      onValueChange={setModuleAddress}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select from registry" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModules.map((module: any) => (
                          <SelectItem key={module.address} value={module.address}>
                            <div className="flex flex-col">
                              <span className="font-medium">{module.name || 'Module'}</span>
                              <span className="text-xs font-mono">{module.address}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  {/* Manual Address Entry */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Or enter address manually</Label>
                    <Input
                      value={moduleAddress}
                      onChange={(e) => setModuleAddress(e.target.value)}
                      placeholder="0x..."
                      className="font-mono"
                    />
                  </div>

                  {/* Address Validation Indicator */}
                  {moduleAddress && (
                    <div className="text-sm">
                      {validatingAddress ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Validating address...
                        </div>
                      ) : ethers.isAddress(moduleAddress) ? (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="h-3 w-3" />
                          Valid address
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600">
                          <X className="h-3 w-3" />
                          Invalid address format
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Detach Warning */}
              {action === 'detach' && currentModules[selectedModuleType] && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    Detaching this module will remove its functionality from the token. 
                    This action can be reversed by attaching a new module later.
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={handleValidate}
                disabled={!validateInput() || validating}
                className="w-full"
              >
                {validating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Validate with Policy Engine
                  </>
                )}
              </Button>
            </TabsContent>

            {/* STEP 2: Validation */}
            <TabsContent value="validation" className="space-y-4 mt-4">
              {validationResult && (
                <>
                  {validationResult.valid ? (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertTitle>Validation Passed</AlertTitle>
                      <AlertDescription>
                        Module {action} operation has been validated successfully.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert variant="destructive">
                      <X className="h-4 w-4" />
                      <AlertTitle>Validation Failed</AlertTitle>
                      <AlertDescription>
                        {validationResult.errors?.join(', ') || 'Operation cannot proceed'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {validationResult.valid && (
                    <Button onClick={handleExecute} className="w-full" disabled={gatewayLoading}>
                      {gatewayLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <ChevronRight className="mr-2 h-4 w-4" />
                          Execute {action === 'attach' ? 'Attach' : 'Detach'} Module
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}

              <Button onClick={handleReset} variant="outline" className="w-full">
                Reset
              </Button>
            </TabsContent>

            {/* STEP 3: Execution */}
            <TabsContent value="execution" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing module {action}...</span>
              </div>
            </TabsContent>

            {/* STEP 4: Complete */}
            <TabsContent value="complete" className="space-y-4 mt-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertTitle>Module {action === 'attach' ? 'Attached' : 'Detached'}</AlertTitle>
                <AlertDescription>
                  Successfully {action}ed {MODULE_INFO[selectedModuleType].label}
                </AlertDescription>
              </Alert>

              <Button onClick={handleReset} className="w-full">
                Manage Another Module
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ModuleManagementPanel;
