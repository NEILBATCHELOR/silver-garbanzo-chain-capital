import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { CarbonOffsetsService } from '../services/carbonOffsetsService';
import { CarbonOffset, CarbonOffsetType, CarbonOffsetStatus } from '../types';

const carbonOffsetFormSchema = z.object({
  type: z.nativeEnum(CarbonOffsetType, {
    required_error: 'Please select a carbon offset type',
  }),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  pricePerTon: z.number().min(0.01, 'Price per ton must be greater than 0'),
  status: z.nativeEnum(CarbonOffsetStatus, {
    required_error: 'Please select a status',
  }),
  verificationStandard: z.string().optional(),
  verificationDate: z.string().optional(),
  expirationDate: z.string().optional(),
});

type CarbonOffsetFormData = z.infer<typeof carbonOffsetFormSchema>;

interface CarbonOffsetFormProps {
  projectId?: string;
  carbonOffset?: CarbonOffset | null;
  onSuccess: (offset: CarbonOffset) => void;
  onCancel: () => void;
}

export function CarbonOffsetForm({ 
  projectId, 
  carbonOffset, 
  onSuccess, 
  onCancel 
}: CarbonOffsetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!carbonOffset;

  const form = useForm<CarbonOffsetFormData>({
    resolver: zodResolver(carbonOffsetFormSchema),
    defaultValues: {
      type: carbonOffset?.type || CarbonOffsetType.RENEWABLE_ENERGY,
      amount: carbonOffset?.amount || 0,
      pricePerTon: carbonOffset?.pricePerTon || 0,
      status: carbonOffset?.status || CarbonOffsetStatus.PENDING,
      verificationStandard: carbonOffset?.verificationStandard || '',
      verificationDate: carbonOffset?.verificationDate 
        ? new Date(carbonOffset.verificationDate).toISOString().split('T')[0]
        : '',
      expirationDate: carbonOffset?.expirationDate 
        ? new Date(carbonOffset.expirationDate).toISOString().split('T')[0]
        : '',
    },
  });

  const onSubmit = async (data: CarbonOffsetFormData) => {
    try {
      setIsSubmitting(true);

      const submitData = {
        projectId: projectId!,
        type: data.type,
        amount: data.amount,
        pricePerTon: data.pricePerTon,
        status: data.status,
        verificationStandard: data.verificationStandard || undefined,
        verificationDate: data.verificationDate || undefined,
        expirationDate: data.expirationDate || undefined,
      };

      let result: CarbonOffset;

      if (isEditing) {
        result = await CarbonOffsetsService.updateOffset({
          offsetId: carbonOffset.offsetId,
          ...submitData,
        });
      } else {
        result = await CarbonOffsetsService.createOffset(submitData);
      }

      onSuccess(result);
    } catch (error) {
      console.error('Error saving carbon offset:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatOffsetType = (type: CarbonOffsetType) => {
    switch (type) {
      case CarbonOffsetType.REFORESTATION:
        return 'Reforestation';
      case CarbonOffsetType.RENEWABLE_ENERGY:
        return 'Renewable Energy';
      case CarbonOffsetType.METHANE_CAPTURE:
        return 'Methane Capture';
      case CarbonOffsetType.ENERGY_EFFICIENCY:
        return 'Energy Efficiency';
      case CarbonOffsetType.OTHER:
        return 'Other';
      default:
        return (type as string).replace('_', ' ');
    }
  };

  const formatOffsetStatus = (status: CarbonOffsetStatus) => {
    switch (status) {
      case CarbonOffsetStatus.PENDING:
        return 'Pending Verification';
      case CarbonOffsetStatus.VERIFIED:
        return 'Verified';
      case CarbonOffsetStatus.RETIRED:
        return 'Retired';
      default:
        return (status as string).replace('_', ' ');
    }
  };

  const totalValue = form.watch('amount') * form.watch('pricePerTon');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Offset Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select offset type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(CarbonOffsetType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {formatOffsetType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Type of carbon offset project
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
                    {Object.values(CarbonOffsetStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatOffsetStatus(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Verification and usage status
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount (tCO2e)</FormLabel>
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
                  Tons of CO2 equivalent
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricePerTon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price per Ton ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter price"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormDescription>
                  USD per tCO2e
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Total Value</FormLabel>
            <div className="px-3 py-2 text-sm bg-muted rounded-md">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <FormDescription>
              Calculated automatically
            </FormDescription>
          </div>
        </div>

        <FormField
          control={form.control}
          name="verificationStandard"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Standard (Optional)</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select verification standard" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="VCS">VCS (Verified Carbon Standard)</SelectItem>
                  <SelectItem value="Gold Standard">Gold Standard</SelectItem>
                  <SelectItem value="CDM">CDM (Clean Development Mechanism)</SelectItem>
                  <SelectItem value="CAR">CAR (Climate Action Reserve)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Third-party verification standard used
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="verificationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Verification Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  When the offset was verified
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="expirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiration Date (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  When the offset expires (if applicable)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
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
              : (isEditing ? 'Update Offset' : 'Create Offset')
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
