/**
 * Form component for stablecoin products
 */

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ProjectType } from '@/types/projects/projectTypes';
import { StablecoinProduct } from '@/types/products';
import { EnhancedStablecoinProduct } from '@/types/products/enhancedProducts';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import DatePickerWithState from '@/components/ui/date-picker-with-state';

interface StablecoinProductFormProps {
  defaultValues?: Partial<EnhancedStablecoinProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  stablecoinType: ProjectType;
  onCancel?: () => void;
}

export default function StablecoinProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  stablecoinType,
  onCancel
}: StablecoinProductFormProps) {
  // Format dates and form fields with appropriate conversions
  const formattedDefaultValues = {
    ...defaultValues,
    issuanceDate: defaultValues?.issuanceDate ? new Date(defaultValues.issuanceDate) : null,
    fractionalizationEnabled: defaultValues?.fractionalizationEnabled ?? true,
    provenanceHistoryEnabled: defaultValues?.provenanceHistoryEnabled ?? true,
    reserveInsurance: defaultValues?.reserveInsurance ?? false,
    physicalRedemption: defaultValues?.physicalRedemption ?? false,
    
    // Convert arrays to comma-separated strings for the form
    depegRiskMitigation: Array.isArray(defaultValues?.depegRiskMitigation) 
      ? defaultValues.depegRiskMitigation.join(', ') 
      : defaultValues?.depegRiskMitigation || '',
    reserveAssets: Array.isArray(defaultValues?.reserveAssets) 
      ? defaultValues.reserveAssets.join(', ') 
      : defaultValues?.reserveAssets || '',
    collateralAssets: Array.isArray(defaultValues?.collateralAssets) 
      ? defaultValues.collateralAssets.join(', ') 
      : defaultValues?.collateralAssets || '',
  };
  
  // Initialize form without validation
  const form = useForm({
    defaultValues: formattedDefaultValues as any,
  });

  // Get stablecoin type label
  const getStablecoinTypeLabel = () => {
    switch (stablecoinType) {
      case ProjectType.FIAT_BACKED_STABLECOIN:
        return 'Fiat-Backed Stablecoin';
      case ProjectType.CRYPTO_BACKED_STABLECOIN:
        return 'Crypto-Backed Stablecoin';
      case ProjectType.COMMODITY_BACKED_STABLECOIN:
        return 'Commodity-Backed Stablecoin';
      case ProjectType.ALGORITHMIC_STABLECOIN:
        return 'Algorithmic Stablecoin';
      case ProjectType.REBASING_STABLECOIN:
        return 'Rebasing Stablecoin';
      default:
        return 'Stablecoin';
    }
  };

  // Set default collateral type based on stablecoin type
  useEffect(() => {
    const defaultCollateralType = () => {
      switch (stablecoinType) {
        case ProjectType.FIAT_BACKED_STABLECOIN:
          return 'Fiat';
        case ProjectType.CRYPTO_BACKED_STABLECOIN:
          return 'Crypto';
        case ProjectType.COMMODITY_BACKED_STABLECOIN:
          return 'Commodity';
        case ProjectType.ALGORITHMIC_STABLECOIN:
          return 'Algorithmic';
        case ProjectType.REBASING_STABLECOIN:
          return 'Rebasing';
        default:
          return undefined;
      }
    };

    // Only set if collateralType is not already set
    if (!form.getValues('collateralType')) {
      form.setValue('collateralType', defaultCollateralType());
    }

    // Set default for algorithmic stablecoins
    if (stablecoinType === ProjectType.ALGORITHMIC_STABLECOIN && !form.getValues('algorithmDescription')) {
      form.setValue('algorithmDescription', 'Supply adjusts algorithmically to maintain peg.');
    }

    // Set default for rebasing stablecoins
    if (stablecoinType === ProjectType.REBASING_STABLECOIN && !form.getValues('rebaseFrequency')) {
      form.setValue('rebaseFrequency', 'Daily');
    }
  }, [stablecoinType, form]);

  // Handle form submission
  const handleSubmit = async (data: any) => {
    console.log('StablecoinProductForm handleSubmit called with data:', data);
    
    // Convert comma-separated strings to arrays for PostgreSQL
    let depegRiskMitigationArray = null;
    if (data.depegRiskMitigation) {
      const mitigations = data.depegRiskMitigation.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      depegRiskMitigationArray = mitigations.length > 0 ? mitigations : null;
    }
      
    let reserveAssetsArray = null;
    if (data.reserveAssets) {
      const assets = data.reserveAssets.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      reserveAssetsArray = assets.length > 0 ? assets : null;
    }
      
    let collateralAssetsArray = null;
    if (data.collateralAssets) {
      const assets = data.collateralAssets.split(',').map((item: string) => item.trim()).filter((item: string) => item !== '');
      collateralAssetsArray = assets.length > 0 ? assets : null;
    }

    // Set collateralTypeEnum based on stablecoin type
    const collateralTypeEnum = (() => {
      switch (stablecoinType) {
        case ProjectType.FIAT_BACKED_STABLECOIN:
          return 'Fiat';
        case ProjectType.CRYPTO_BACKED_STABLECOIN:
          return 'Crypto';
        case ProjectType.COMMODITY_BACKED_STABLECOIN:
          return 'Commodity';
        case ProjectType.ALGORITHMIC_STABLECOIN:
          return 'Algorithmic';
        case ProjectType.REBASING_STABLECOIN:
          return 'Hybrid'; // Rebasing is typically a hybrid approach
        default:
          return data.collateralType || 'None';
      }
    })();

    // Prepare the data for submission
    const formData = {
      ...data,
      depegRiskMitigation: depegRiskMitigationArray,
      reserveAssets: reserveAssetsArray,
      collateralAssets: collateralAssetsArray,
      collateralTypeEnum,
      assetType: stablecoinType,
    };

    console.log('Calling onSubmit with formData:', formData);
    try {
      await onSubmit(formData);
      console.log('onSubmit completed successfully');
    } catch (error) {
      console.error('Error in onSubmit:', error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {getStablecoinTypeLabel()} Configuration
                </p>
                
                <FormField
                  control={form.control}
                  name="assetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="assetSymbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Symbol</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issuer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issuer</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value as string}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issuanceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issuance Date</FormLabel>
                      <DatePickerWithState
                        date={field.value as Date | undefined}
                        setDate={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="targetRaise"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Raise</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Blockchain Configuration</h3>
                
                <FormField
                  control={form.control}
                  name="blockchainNetwork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blockchain Network</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value as string}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blockchain" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ethereum">Ethereum</SelectItem>
                          <SelectItem value="Polygon">Polygon</SelectItem>
                          <SelectItem value="Arbitrum">Arbitrum</SelectItem>
                          <SelectItem value="Optimism">Optimism</SelectItem>
                          <SelectItem value="Base">Base</SelectItem>
                          <SelectItem value="Avalanche">Avalanche</SelectItem>
                          <SelectItem value="Near">Near</SelectItem>
                          <SelectItem value="Ripple">Ripple</SelectItem>
                          <SelectItem value="Stellar">Stellar</SelectItem>
                          <SelectItem value="Sui">Sui</SelectItem>
                          <SelectItem value="Aptos">Aptos</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="smartContractAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Smart Contract Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fractionalizationEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Fractionalization</FormLabel>
                        <FormDescription>
                          Allow tokens to be divisible into smaller units
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="provenanceHistoryEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value as boolean}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable Provenance History</FormLabel>
                        <FormDescription>
                          Track all transactions and ownership changes on-chain
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Supply & Peg Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Supply</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="circulatingSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Circulating Supply</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="pegValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peg Value</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value?.toString() || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Collateral & Stability</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="collateralType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collateral Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value as string}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select collateral type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Fiat">Fiat Currency</SelectItem>
                          <SelectItem value="Crypto">Cryptocurrency</SelectItem>
                          <SelectItem value="Commodity">Commodity</SelectItem>
                          <SelectItem value="Algorithmic">Algorithmic</SelectItem>
                          <SelectItem value="Mixed">Mixed Collateral</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                {stablecoinType !== ProjectType.ALGORITHMIC_STABLECOIN && (
                  <FormField
                    control={form.control}
                    name="collateralRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collateral Ratio</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                        <FormDescription>
                          Ratio of collateral to stablecoin value (e.g., 1.0 for 100%)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}
                
                {stablecoinType === ProjectType.CRYPTO_BACKED_STABLECOIN && (
                  <FormField
                    control={form.control}
                    name="overcollateralizationThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overcollateralization Threshold</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormDescription>
                          Minimum ratio before liquidation (e.g., 1.5 for 150%)
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                )}
                
                <FormField
                  control={form.control}
                  name="stabilityMechanism"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stability Mechanism</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value as string || ''}
                          placeholder="Describe how the stablecoin maintains its peg"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {stablecoinType === ProjectType.REBASING_STABLECOIN && (
                  <FormField
                    control={form.control}
                    name="rebaseFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rebase Frequency</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value as string}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hourly">Hourly</SelectItem>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
                
                {stablecoinType === ProjectType.ALGORITHMIC_STABLECOIN && (
                  <FormField
                    control={form.control}
                    name="algorithmDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Algorithm Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value?.toString() || ''}
                            placeholder="Describe the algorithm that maintains the stablecoin's peg"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Risk Management & Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reserveManagementPolicy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reserve Management Policy</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value as string || ''}
                          placeholder="Describe how reserves are managed"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="auditFrequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audit Frequency</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value as string}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audit frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Daily">Daily</SelectItem>
                          <SelectItem value="Weekly">Weekly</SelectItem>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="Annually">Annually</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="redemptionMechanism"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redemption Mechanism</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value as string || ''}
                          placeholder="Describe how users can redeem the stablecoin"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="depegRiskMitigation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depeg Risk Mitigation (comma-separated)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value as string || ''}
                          placeholder="List depeg risk mitigation strategies"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="complianceRules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance Rules</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          value={field.value as string || ''}
                          placeholder="Describe compliance rules and regulations"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {stablecoinType !== ProjectType.ALGORITHMIC_STABLECOIN && (
                  <FormField
                    control={form.control}
                    name="liquidationTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liquidation Terms</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="Describe the liquidation process if collateral falls below threshold"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Fiat-Backed Specific Fields */}
        {stablecoinType === ProjectType.FIAT_BACKED_STABLECOIN && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Fiat-Backed Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reserveAssets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reserve Assets (comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="USD, EUR, GBP"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reserveAuditFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reserve Audit Frequency</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value as string}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select audit frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                            <SelectItem value="Annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reserveCustodian"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reserve Custodian</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="reserveInsurance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Reserve Insurance</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Crypto-Backed Specific Fields */}
        {stablecoinType === ProjectType.CRYPTO_BACKED_STABLECOIN && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Crypto-Backed Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="collateralAssets"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collateral Assets (comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="ETH, BTC, LINK"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="minimumCollateralizationRatio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Collateralization Ratio</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="liquidationPenalty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liquidation Penalty (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="oracleProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Oracle Provider</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Commodity-Backed Specific Fields */}
        {stablecoinType === ProjectType.COMMODITY_BACKED_STABLECOIN && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Commodity-Backed Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="commodityType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commodity Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value as string}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select commodity type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Gold">Gold</SelectItem>
                            <SelectItem value="Silver">Silver</SelectItem>
                            <SelectItem value="Oil">Oil</SelectItem>
                            <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                            <SelectItem value="Agricultural">Agricultural Products</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="storageProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Storage Provider</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="auditProvider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Audit Provider</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="redemptionFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Redemption Fee (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="physicalRedemption"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Physical Redemption Available</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Algorithmic Specific Fields */}
        {stablecoinType === ProjectType.ALGORITHMIC_STABLECOIN && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Algorithmic Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="algorithmType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Algorithm Type</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value as string}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select algorithm type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Seigniorage">Seigniorage Shares</SelectItem>
                            <SelectItem value="Rebase">Rebase Mechanism</SelectItem>
                            <SelectItem value="Hybrid">Hybrid Model</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="secondaryTokenSymbol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Secondary Token Symbol</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="expansionMechanism"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expansion Mechanism</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="Describe how supply increases when above peg"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="contractionMechanism"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraction Mechanism</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="Describe how supply decreases when below peg"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="governanceToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Governance Token</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Rebasing Specific Fields */}
        {stablecoinType === ProjectType.REBASING_STABLECOIN && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Rebasing Specific Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rebaseOracle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rebase Oracle</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value as string || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="positiveRebaseLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Positive Rebase Limit (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="negativeRebaseLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Negative Rebase Limit (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value?.toString() || ''} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rebaseGovernance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rebase Governance</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value as string || ''}
                            placeholder="Describe governance process for rebase decisions"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Stablecoin Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}