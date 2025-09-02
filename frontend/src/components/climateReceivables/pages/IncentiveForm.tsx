import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { ClimateIncentivesService } from '../services/climateIncentivesService';
import { energyAssetsService } from '../services/energyAssetsService';
import { climateReceivablesService } from '../services/climateReceivablesService';
import { ClimateIncentive, IncentiveType, IncentiveStatus, EnergyAsset, ClimateReceivable } from '../types';

const incentiveFormSchema = z.object({
  type: z.nativeEnum(IncentiveType, {
    required_error: 'Please select an incentive type',
  }),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  status: z.nativeEnum(IncentiveStatus, {
    required_error: 'Please select a status',
  }),
  assetId: z.string().optional(),
  receivableId: z.string().optional(),
  expectedReceiptDate: z.string().optional(),
});

type IncentiveFormData = z.infer<typeof incentiveFormSchema>;

interface IncentiveFormProps {
  projectId?: string;
  incentive?: ClimateIncentive | null;
  onSuccess: (incentive: ClimateIncentive) => void;
  onCancel: () => void;
}

export function IncentiveForm({ 
  projectId, 
  incentive, 
  onSuccess, 
  onCancel 
}: IncentiveFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assets, setAssets] = useState<EnergyAsset[]>([]);
  const [receivables, setReceivables] = useState<ClimateReceivable[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [loadingReceivables, setLoadingReceivables] = useState(true);
  const isEditing = !!incentive;

  const form = useForm<IncentiveFormData>({
    resolver: zodResolver(incentiveFormSchema),
    defaultValues: {
      type: incentive?.type || IncentiveType.TAX_CREDIT,
      amount: incentive?.amount || 0,
      status: incentive?.status || IncentiveStatus.PENDING,
      assetId: incentive?.assetId || 'none',
      receivableId: incentive?.receivableId || 'none',
      expectedReceiptDate: incentive?.expectedReceiptDate 
        ? new Date(incentive.expectedReceiptDate).toISOString().split('T')[0]
        : '',
    },
  });

  useEffect(() => {
    loadAssets();
    loadReceivables();
  }, []);

  const loadAssets = async () => {
    try {
      setLoadingAssets(true);
      const assetsData = await energyAssetsService.getAll();
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading energy assets:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  const loadReceivables = async () => {
    try {
      setLoadingReceivables(true);
      const receivablesData = await climateReceivablesService.getAll();
      setReceivables(receivablesData);
    } catch (error) {
      console.error('Error loading climate receivables:', error);
    } finally {
      setLoadingReceivables(false);
    }
  };

  const onSubmit = async (data: IncentiveFormData) => {
    try {
      setIsSubmitting(true);

      const submitData = {
        type: data.type,
        amount: data.amount,
        status: data.status,
        projectId,
        assetId: data.assetId && data.assetId !== 'none' ? data.assetId : undefined,
        receivableId: data.receivableId && data.receivableId !== 'none' ? data.receivableId : undefined,
        expectedReceiptDate: data.expectedReceiptDate || undefined,
      };

      let result: ClimateIncentive;

      if (isEditing) {
        result = await ClimateIncentivesService.updateIncentive({
          incentiveId: incentive.incentiveId,
          ...submitData,
        });
      } else {
        result = await ClimateIncentivesService.createIncentive(submitData);
      }

      onSuccess(result);
    } catch (error) {
      console.error('Error saving incentive:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatIncentiveType = (type: IncentiveType) => {
    switch (type) {
      case IncentiveType.TAX_CREDIT:
        return 'Tax Credit';
      case IncentiveType.REC:
        return 'Renewable Energy Certificate';
      case IncentiveType.GRANT:
        return 'Grant';
      case IncentiveType.SUBSIDY:
        return 'Subsidy';
      case IncentiveType.OTHER:
        return 'Other';
      default:
        return (type as string).replace('_', ' ');
    }
  };

  const formatIncentiveStatus = (status: IncentiveStatus) => {
    switch (status) {
      case IncentiveStatus.PENDING:
        return 'Pending';
      case IncentiveStatus.APPLIED:
        return 'Applied';
      case IncentiveStatus.APPROVED:
        return 'Approved';
      case IncentiveStatus.RECEIVED:
        return 'Received';
      case IncentiveStatus.REJECTED:
        return 'Rejected';
      default:
        return (status as string).replace('_', ' ');
    }
  };

  const formatAssetDisplayName = (asset: EnergyAsset) => {
    return `${asset.name} - ${asset.type} (${asset.location}) - ${asset.capacity}MW`;
  };

  const formatReceivableDisplayName = (receivable: ClimateReceivable) => {
    const amount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(receivable.amount);
    return `${amount} - Due: ${new Date(receivable.dueDate).toLocaleDateString()} (Risk: ${receivable.riskScore})`;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incentive Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select incentive type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(IncentiveType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatIncentiveType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose the type of climate incentive
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
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
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
                  Current status of the incentive
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ($)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <FormDescription>
                The monetary value of the incentive in USD
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="assetId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Energy Asset (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingAssets ? "Loading assets..." : "Select energy asset"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">None - No asset linkage</span>
                    </SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.assetId} value={asset.assetId}>
                        {formatAssetDisplayName(asset)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Link to specific energy asset if applicable or leave blank
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="receivableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Climate Receivable (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingReceivables ? "Loading receivables..." : "Select climate receivable"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-gray-500">None - No receivable linkage</span>
                    </SelectItem>
                    {receivables.map((receivable) => (
                      <SelectItem key={receivable.receivableId} value={receivable.receivableId}>
                        {formatReceivableDisplayName(receivable)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Link to specific climate receivable if applicable or leave blank
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="expectedReceiptDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expected Receipt Date (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                When you expect to receive this incentive
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
              : (isEditing ? 'Update Incentive' : 'Create Incentive')
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
