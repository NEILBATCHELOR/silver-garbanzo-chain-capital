/**
 * Form component for digital tokenized fund products
 */

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DigitalTokenizedFundProduct } from '@/types/products';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel 
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
import { Card, CardContent } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';

// Define the form schema using zod (validation removed)
const digitalTokenizedFundProductSchema = z.object({
  assetName: z.string().optional(),
  assetSymbol: z.string().optional(),
  assetType: z.string().optional(),
  issuer: z.string().optional(),
  blockchainNetwork: z.string().optional(),
  smartContractAddress: z.string().optional(),
  issuanceDate: z.date().optional().nullable(),
  totalSupply: z.coerce.number().optional(),
  circulatingSupply: z.coerce.number().optional(),
  nav: z.coerce.number().optional(),
  fractionalizationEnabled: z.boolean().optional(),
  complianceRules: z.string().optional(),
  permissionControls: z.string().optional(),
  embeddedRights: z.string().optional(),
  provenanceHistoryEnabled: z.boolean().optional(),
  tokenEconomics: z.string().optional(),
  custodyArrangements: z.string().optional(),
  upgradeGovernance: z.string().optional(),
  status: z.string().optional(),
  targetRaise: z.coerce.number().optional(),
});

interface DigitalTokenizedFundProductFormProps {
  defaultValues?: Partial<DigitalTokenizedFundProduct>;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export default function DigitalTokenizedFundProductForm({ 
  defaultValues, 
  onSubmit, 
  isSubmitting = false,
  onCancel
}: DigitalTokenizedFundProductFormProps) {
  // Format dates for the form
  const formattedDefaultValues = {
    ...defaultValues,
    issuanceDate: defaultValues?.issuanceDate ? new Date(defaultValues.issuanceDate) : null,
  };
  
  // Initialize form with schema validation
  const form = useForm<z.infer<typeof digitalTokenizedFundProductSchema>>({
    resolver: zodResolver(digitalTokenizedFundProductSchema),
    defaultValues: formattedDefaultValues as any,
    mode: 'onSubmit',
  });
  
  // For debugging form validation errors
  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  // Handle form submission
  const handleSubmit = async (data: z.infer<typeof digitalTokenizedFundProductSchema>) => {
    console.log('DigitalTokenizedFundProductForm handleSubmit called with data:', data);
    
    // Prepare the data for submission
    const formData = {
      ...data
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
      <form onSubmit={form.handleSubmit(handleSubmit, onError)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
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
                  name="assetType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asset Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select asset type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Digital Tokenized Fund">Digital Tokenized Fund</SelectItem>
                          <SelectItem value="Security Token">Security Token</SelectItem>
                          <SelectItem value="Real Estate Fund Token">Real Estate Fund Token</SelectItem>
                          <SelectItem value="Equity Token">Equity Token</SelectItem>
                          <SelectItem value="Debt Token">Debt Token</SelectItem>
                          <SelectItem value="Private Equity Token">Private Equity Token</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Input {...field} value={field.value || ''} />
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="In Development">In Development</SelectItem>
                          <SelectItem value="Fundraising">Fundraising</SelectItem>
                          <SelectItem value="Trading">Trading</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                          <SelectItem value="Terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Blockchain Details</h3>
                
                <FormField
                  control={form.control}
                  name="blockchainNetwork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blockchain Network</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select blockchain network" />
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
                        <Input {...field} value={field.value || ''} />
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
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Fractionalization Enabled
                        </FormLabel>
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
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Provenance History Enabled
                        </FormLabel>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Supply</h3>
                
                <FormField
                  control={form.control}
                  name="totalSupply"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Supply</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} value={field.value || ''} />
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
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="tokenEconomics"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Economics</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Valuation & Offering</h3>
                
                <FormField
                  control={form.control}
                  name="nav"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Net Asset Value (NAV)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} value={field.value || ''} />
                      </FormControl>
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
                        <Input type="number" {...field} value={field.value || ''} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="issuanceDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issuance Date</FormLabel>
                      <DatePicker
                        date={field.value as Date | undefined}
                        onSelect={(date) => field.onChange(date)}
                      />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Custody</h3>
                
                <FormField
                  control={form.control}
                  name="custodyArrangements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custody Arrangements</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ''} />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Governance</h3>
                
                <FormField
                  control={form.control}
                  name="embeddedRights"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Embedded Rights</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ''}
                          rows={3}
                          placeholder="Pro-rata share of underlying fund assets, voting rights, etc."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="upgradeGovernance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upgrade Governance</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ''}
                          rows={3}
                          placeholder="Mechanism for upgrading the token contract, governance rights, etc."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Compliance & Controls</h3>
                
                <FormField
                  control={form.control}
                  name="complianceRules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance Rules</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ''}
                          rows={3}
                          placeholder="KYC/AML requirements, regulatory standards, etc."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="permissionControls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permission Controls</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ''}
                          rows={3}
                          placeholder="Whitelists for transfers, access controls, etc."
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => {
            console.log('Debug: Current form values:', form.getValues());
            console.log('Debug: Form state:', form.formState);
            form.handleSubmit(handleSubmit, onError)();
          }}>
            Debug Submit
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Product Details'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
