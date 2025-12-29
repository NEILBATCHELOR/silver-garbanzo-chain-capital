/**
 * Physical Delivery Modal Component
 * Interface for requesting physical delivery of commodities instead of liquidation
 * Commodity-specific feature for avoiding forced sale
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePhysicalDeliveryOptions, useRequestPhysicalDelivery } from '@/hooks/trade-finance';
import { Warehouse, Truck, MapPin, DollarSign, Calendar, Info, CheckCircle2 } from 'lucide-react';
import { formatEther, parseEther } from 'viem';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

interface PhysicalDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  commodityType: string;
  availableQuantity: string; // In Wei
  userAddress?: string;
}

export function PhysicalDeliveryModal({
  isOpen,
  onClose,
  commodityType,
  availableQuantity,
  userAddress
}: PhysicalDeliveryModalProps) {
  const { data: deliveryOptions, isLoading } = usePhysicalDeliveryOptions(commodityType);
  const requestDelivery = useRequestPhysicalDelivery();

  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'complete'>('select');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSelectedWarehouse('');
      setQuantity('');
      setDeliveryAddress('');
      setStep('select');
    }
  }, [isOpen]);

  const selectedOption = deliveryOptions?.find(opt => opt.warehouse_address === selectedWarehouse);
  const maxQuantity = BigInt(availableQuantity);
  const requestedQuantity = quantity ? parseEther(quantity) : BigInt(0);
  const totalCost = selectedOption 
    ? BigInt(selectedOption.storage_cost) * requestedQuantity / BigInt(1e18)
    : BigInt(0);

  const handleRequestDelivery = async () => {
    if (!selectedWarehouse || !quantity || !deliveryAddress) {
      toast.error('Please fill in all fields');
      return;
    }

    if (requestedQuantity > maxQuantity) {
      toast.error('Requested quantity exceeds available amount');
      return;
    }

    setStep('processing');

    try {
      await requestDelivery.mutateAsync({
        warehouseAddress: selectedWarehouse,
        commodityType,
        quantity: requestedQuantity,
        deliveryAddress,
      });

      setStep('complete');
      toast.success('Physical delivery request submitted successfully');
      
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      toast.error('Failed to request physical delivery');
      setStep('confirm');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Request Physical Delivery
          </DialogTitle>
          <DialogDescription>
            Avoid liquidation by requesting physical delivery of your commodity collateral
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6 py-4">
            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Physical Delivery Option</AlertTitle>
              <AlertDescription>
                Instead of liquidating your position on-chain, you can take physical delivery of the underlying commodity.
                This option allows you to maintain ownership while satisfying debt obligations.
              </AlertDescription>
            </Alert>

            {/* Commodity Details */}
            <div className="p-4 rounded-lg bg-secondary">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Commodity Type</span>
                <Badge variant="secondary">{commodityType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Quantity</span>
                <span className="font-mono font-medium">{formatEther(maxQuantity)}</span>
              </div>
            </div>

            {/* Warehouse Selection */}
            <div className="space-y-3">
              <Label>Select Warehouse</Label>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : deliveryOptions && deliveryOptions.length > 0 ? (
                <RadioGroup value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <div className="space-y-3">
                    {deliveryOptions.map((option) => (
                      <div
                        key={option.warehouse_address}
                        className={cn(
                          'flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer',
                          selectedWarehouse === option.warehouse_address
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        )}
                        onClick={() => setSelectedWarehouse(option.warehouse_address)}
                      >
                        <RadioGroupItem 
                          value={option.warehouse_address} 
                          id={option.warehouse_address}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Warehouse className="h-4 w-4" />
                            <code className="text-xs">
                              {option.warehouse_address.slice(0, 6)}...{option.warehouse_address.slice(-4)}
                            </code>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Available</div>
                              <div className="font-medium">{formatEther(BigInt(option.available_quantity))}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Storage Cost</div>
                              <div className="font-medium">${formatEther(BigInt(option.storage_cost))}/unit</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Delivery Time</div>
                              <div className="font-medium">{option.delivery_timeframe_days} days</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    No warehouses currently available for {commodityType} delivery.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Delivery Quantity</Label>
              <div className="relative">
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="pr-20"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7"
                  onClick={() => setQuantity(formatEther(maxQuantity))}
                >
                  Max
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Maximum available: {formatEther(maxQuantity)}
              </p>
            </div>

            {/* Delivery Address */}
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">
                <MapPin className="inline h-4 w-4 mr-1" />
                Delivery Address
              </Label>
              <Input
                id="deliveryAddress"
                placeholder="Enter physical delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Provide the physical address where you want the commodity delivered
              </p>
            </div>

            {/* Cost Summary */}
            {selectedOption && requestedQuantity > BigInt(0) && (
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono">{quantity}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Storage Cost</span>
                  <span className="font-mono">${formatEther(totalCost)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Delivery Timeframe</span>
                  <span>{selectedOption.delivery_timeframe_days} days</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-medium">
                  <span>Total Cost</span>
                  <span className="font-mono">${formatEther(totalCost)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6 py-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Confirm Physical Delivery Request</AlertTitle>
              <AlertDescription>
                Please review the details below before submitting your delivery request.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 p-4 rounded-lg border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Commodity</div>
                  <div className="font-medium">{commodityType}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Quantity</div>
                  <div className="font-mono font-medium">{quantity}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Warehouse</div>
                  <code className="text-xs">{selectedWarehouse}</code>
                </div>
                <div className="col-span-2">
                  <div className="text-sm text-muted-foreground">Delivery Address</div>
                  <div className="text-sm">{deliveryAddress}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Total Cost</div>
                  <div className="font-mono font-medium">${formatEther(totalCost)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Est. Delivery</div>
                  <div>{selectedOption?.delivery_timeframe_days} days</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-lg font-medium">Processing Delivery Request...</p>
            <p className="text-sm text-muted-foreground">Please wait while we submit your request</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-lg font-medium">Delivery Request Submitted!</p>
            <p className="text-sm text-muted-foreground text-center">
              Your physical delivery request has been submitted successfully.
              <br />
              You will receive updates on the delivery status.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'select' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!selectedWarehouse || !quantity || !deliveryAddress || requestedQuantity > maxQuantity}
              >
                Continue
              </Button>
            </>
          )}
          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                Back
              </Button>
              <Button onClick={handleRequestDelivery}>
                Submit Request
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
