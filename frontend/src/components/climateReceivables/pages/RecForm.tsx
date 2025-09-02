import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Zap, Check, ChevronsUpDown, Leaf, Building } from 'lucide-react';
import { cn } from '@/utils/utils';

import { ClimateIncentivesService } from '../services/climateIncentivesService';
import { energyAssetsService } from '../services/energyAssetsService';
import { climateReceivablesService } from '../services/climateReceivablesService';
import { ClimateIncentive, IncentiveType, IncentiveStatus, EnergyAsset, ClimateReceivable } from '../types';

const recFormSchema = z.object({
  amount: z.number().min(0.01, 'REC value must be greater than 0'),
  status: z.nativeEnum(IncentiveStatus, {
    required_error: 'Please select a status',
  }),
  assetId: z.string().optional(),
  receivableId: z.string().optional(),
  expectedReceiptDate: z.string().optional(),
});

type RecFormData = z.infer<typeof recFormSchema>;

interface RecFormProps {
  projectId?: string;
  rec?: ClimateIncentive | null;
  onSuccess: (rec: ClimateIncentive) => void;
  onCancel: () => void;
}

export function RecForm({ 
  projectId, 
  rec, 
  onSuccess, 
  onCancel 
}: RecFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [energyAssets, setEnergyAssets] = useState<EnergyAsset[]>([]);
  const [climateReceivables, setClimateReceivables] = useState<ClimateReceivable[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isLoadingReceivables, setIsLoadingReceivables] = useState(false);
  const [assetSearchOpen, setAssetSearchOpen] = useState(false);
  const [receivableSearchOpen, setReceivableSearchOpen] = useState(false);
  const isEditing = !!rec;

  const form = useForm<RecFormData>({
    resolver: zodResolver(recFormSchema),
    defaultValues: {
      amount: rec?.amount || 0,
      status: rec?.status || IncentiveStatus.PENDING,
      assetId: rec?.assetId || '',
      receivableId: rec?.receivableId || '',
      expectedReceiptDate: rec?.expectedReceiptDate 
        ? new Date(rec.expectedReceiptDate).toISOString().split('T')[0]
        : '',
    },
  });

  // Load energy assets for dropdown
  useEffect(() => {
    const loadEnergyAssets = async () => {
      try {
        setIsLoadingAssets(true);
        const assets = await energyAssetsService.getAll();
        setEnergyAssets(assets);
      } catch (error) {
        console.error('Error loading energy assets:', error);
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadEnergyAssets();
  }, []);

  // Load climate receivables for dropdown
  useEffect(() => {
    const loadClimateReceivables = async () => {
      try {
        setIsLoadingReceivables(true);
        const receivables = await climateReceivablesService.getAll();
        setClimateReceivables(receivables);
      } catch (error) {
        console.error('Error loading climate receivables:', error);
      } finally {
        setIsLoadingReceivables(false);
      }
    };

    loadClimateReceivables();
  }, []);

  const onSubmit = async (data: RecFormData) => {
    try {
      setIsSubmitting(true);

      const submitData = {
        type: IncentiveType.REC, // Always set type to REC
        amount: data.amount,
        status: data.status,
        projectId,
        assetId: data.assetId || undefined,
        receivableId: data.receivableId || undefined,
        expectedReceiptDate: data.expectedReceiptDate || undefined,
      };

      let result: ClimateIncentive;

      if (isEditing) {
        result = await ClimateIncentivesService.updateIncentive({
          incentiveId: rec.incentiveId,
          ...submitData,
        });
      } else {
        result = await ClimateIncentivesService.createIncentive(submitData);
      }

      onSuccess(result);
    } catch (error) {
      console.error('Error saving REC:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatIncentiveStatus = (status: IncentiveStatus) => {
    switch (status) {
      case IncentiveStatus.PENDING:
        return 'Pending Issuance';
      case IncentiveStatus.APPLIED:
        return 'Application Submitted';
      case IncentiveStatus.APPROVED:
        return 'Approved for Issuance';
      case IncentiveStatus.RECEIVED:
        return 'Certificates Received';
      case IncentiveStatus.REJECTED:
        return 'Application Rejected';
      default:
        return (status as string).replace('_', ' ');
    }
  };

  return (
    <div className="space-y-6">
      {/* REC Header */}
      <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
        <Zap className="h-6 w-6 text-green-600" />
        <div>
          <h3 className="font-semibold text-green-900">Renewable Energy Certificate</h3>
          <p className="text-sm text-green-700">
            1 MWh of renewable energy generation = 1 REC
          </p>
        </div>
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
          REC
        </Badge>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>REC Value ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter REC market value"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  The current market value of this Renewable Energy Certificate in USD
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select certificate status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(IncentiveStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatIncentiveStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Current status of the REC issuance process
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          <div className="space-y-4">
            <h4 className="text-lg font-medium">Asset & Receivable Links</h4>
            
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Energy Asset ID (Optional)</FormLabel>
                    <Popover open={assetSearchOpen} onOpenChange={setAssetSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? energyAssets.find(asset => asset.assetId === field.value)?.name || 'Asset not found'
                              : 'Select energy asset...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search energy assets..." 
                            disabled={isLoadingAssets}
                          />
                          <CommandEmpty>
                            {isLoadingAssets ? 'Loading assets...' : 'No energy assets found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {/* Clear selection option */}
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange('');
                                setAssetSearchOpen(false);
                              }}
                            >
                              <div className="flex items-center">
                                <div className="mr-2 h-4 w-4" /> {/* Empty space for alignment */}
                                <span className="text-muted-foreground">Clear selection</span>
                              </div>
                            </CommandItem>
                            {energyAssets.map((asset) => (
                              <CommandItem
                                value={asset.name + ' ' + asset.location + ' ' + asset.type}
                                key={asset.assetId}
                                onSelect={() => {
                                  field.onChange(asset.assetId);
                                  setAssetSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    asset.assetId === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <Leaf className="h-4 w-4 text-green-600" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{asset.name}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {asset.type.toUpperCase()} • {asset.location} • {asset.capacity} MW
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Link to the renewable energy asset generating this REC
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="receivableId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Receivable ID (Optional)</FormLabel>
                    <Popover open={receivableSearchOpen} onOpenChange={setReceivableSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'justify-between',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value
                              ? (() => {
                                  const receivable = climateReceivables.find(r => r.receivableId === field.value);
                                  return receivable 
                                    ? `$${receivable.amount.toLocaleString()} - ${receivable.asset?.name || 'Unknown Asset'}`
                                    : 'Receivable not found';
                                })()
                              : 'Select climate receivable...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[350px] p-0">
                        <Command>
                          <CommandInput 
                            placeholder="Search receivables..." 
                            disabled={isLoadingReceivables}
                          />
                          <CommandEmpty>
                            {isLoadingReceivables ? 'Loading receivables...' : 'No climate receivables found.'}
                          </CommandEmpty>
                          <CommandGroup>
                            {/* Clear selection option */}
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange('');
                                setReceivableSearchOpen(false);
                              }}
                            >
                              <div className="flex items-center">
                                <div className="mr-2 h-4 w-4" /> {/* Empty space for alignment */}
                                <span className="text-muted-foreground">Clear selection</span>
                              </div>
                            </CommandItem>
                            {climateReceivables.map((receivable) => (
                              <CommandItem
                                value={`${receivable.amount} ${receivable.asset?.name || ''} ${receivable.dueDate}`}
                                key={receivable.receivableId}
                                onSelect={() => {
                                  field.onChange(receivable.receivableId);
                                  setReceivableSearchOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    receivable.receivableId === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0'
                                  )}
                                />
                                <div className="flex items-center gap-2">
                                  <Building className="h-4 w-4 text-blue-600" />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      ${receivable.amount.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-muted-foreground">
                                      {receivable.asset?.name || 'No Asset'} • Due: {new Date(receivable.dueDate).toLocaleDateString()}
                                      {receivable.riskScore && ` • Risk: ${receivable.riskScore}%`}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Link to related climate receivable if applicable
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="expectedReceiptDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expected Issuance Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  When you expect the REC certificates to be issued by the registry
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">About RECs</h4>
            <p className="text-sm text-blue-700 mb-2">
              Renewable Energy Certificates represent the environmental benefits of renewable electricity generation. 
              Key characteristics:
            </p>
            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>1 REC = 1 MWh of renewable energy generation</li>
              <li>Tracked and verified by certified registries</li>
              <li>Can be traded separately from the physical electricity</li>
              <li>Used for renewable energy procurement and compliance</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...') 
                : (isEditing ? 'Update REC' : 'Create REC')
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
