/**
 * Warehouse Transfer Modal Component
 * Interface for transferring commodity warehouse receipts between warehouses
 * Enables flexible collateral management and optimization
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
import { useWarehouseInventory, useWarehouseTransfer } from '@/hooks/trade-finance';
import { Warehouse, ArrowRight, Package, MapPin, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatEther, parseEther } from 'viem';
import { toast } from 'sonner';
import { cn } from '@/utils/utils';

interface WarehouseTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  commodityType?: string;
  nftTokenId?: string;
  initialQuantity?: string;
}

interface WarehouseLocation {
  address: string;
  name: string;
  location: string;
  capacity: string;
  available: string;
  fee_percentage: number;
}

export function WarehouseTransferModal({
  isOpen,
  onClose,
  commodityType = '',
  nftTokenId = '',
  initialQuantity = '0'
}: WarehouseTransferModalProps) {
  const { data: inventory, isLoading } = useWarehouseInventory();
  const warehouseTransfer = useWarehouseTransfer();

  const [fromWarehouse, setFromWarehouse] = useState<string>('');
  const [toWarehouse, setToWarehouse] = useState<string>('');
  const [selectedCommodity, setSelectedCommodity] = useState<string>(commodityType);
  const [quantity, setQuantity] = useState<string>(formatEther(BigInt(initialQuantity)));
  const [tokenId, setTokenId] = useState<string>(nftTokenId);
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'complete'>('select');

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setFromWarehouse('');
      setToWarehouse('');
      setSelectedCommodity(commodityType);
      setQuantity(formatEther(BigInt(initialQuantity)));
      setTokenId(nftTokenId);
      setStep('select');
    }
  }, [isOpen, commodityType, nftTokenId, initialQuantity]);

  // Mock warehouse data - replace with actual data from inventory
  const warehouses: WarehouseLocation[] = [
    {
      address: '0x1234567890123456789012345678901234567890',
      name: 'London Metal Exchange Vault',
      location: 'London, UK',
      capacity: '10000',
      available: '7500',
      fee_percentage: 0.1
    },
    {
      address: '0x2345678901234567890123456789012345678901',
      name: 'COMEX Warehouse',
      location: 'New York, USA',
      capacity: '15000',
      available: '12000',
      fee_percentage: 0.15
    },
    {
      address: '0x3456789012345678901234567890123456789012',
      name: 'Shanghai Gold Exchange',
      location: 'Shanghai, China',
      capacity: '8000',
      available: '6000',
      fee_percentage: 0.12
    }
  ];

  const fromWarehouseData = warehouses.find(w => w.address === fromWarehouse);
  const toWarehouseData = warehouses.find(w => w.address === toWarehouse);
  const transferQuantity = quantity ? parseEther(quantity) : BigInt(0);
  const transferFee = toWarehouseData && transferQuantity > BigInt(0)
    ? (transferQuantity * BigInt(Math.floor(toWarehouseData.fee_percentage * 100))) / BigInt(10000)
    : BigInt(0);

  const handleTransfer = async () => {
    if (!fromWarehouse || !toWarehouse || !selectedCommodity || !quantity || !tokenId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (fromWarehouse === toWarehouse) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    setStep('processing');

    try {
      await warehouseTransfer.mutateAsync({
        from_warehouse: fromWarehouse,
        to_warehouse: toWarehouse,
        commodity_type: selectedCommodity,
        quantity: transferQuantity.toString(),
        nft_token_id: tokenId,
      });

      setStep('complete');
      toast.success('Warehouse transfer initiated successfully');

      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (error) {
      toast.error('Failed to initiate warehouse transfer');
      setStep('confirm');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Transfer Warehouse Receipt
          </DialogTitle>
          <DialogDescription>
            Transfer commodity collateral between approved warehouses
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-6 py-4">
            {/* Info Alert */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Warehouse Transfer</AlertTitle>
              <AlertDescription>
                Transfer your commodity warehouse receipts to optimize storage costs, location, or prepare for physical delivery.
                Transfers are recorded on-chain and update your collateral position.
              </AlertDescription>
            </Alert>

            {/* Commodity & Token ID */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commodity">Commodity Type</Label>
                <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                  <SelectTrigger id="commodity">
                    <SelectValue placeholder="Select commodity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOLD">Gold (Au)</SelectItem>
                    <SelectItem value="SILVER">Silver (Ag)</SelectItem>
                    <SelectItem value="COPPER">Copper (Cu)</SelectItem>
                    <SelectItem value="OIL">Crude Oil</SelectItem>
                    <SelectItem value="WHEAT">Wheat</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tokenId">NFT Token ID</Label>
                <Input
                  id="tokenId"
                  placeholder="Enter warehouse receipt NFT ID"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                />
              </div>
            </div>

            {/* From Warehouse */}
            <div className="space-y-2">
              <Label>From Warehouse (Source)</Label>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <Select value={fromWarehouse} onValueChange={setFromWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.address} value={warehouse.address}>
                        <div className="flex items-center gap-2 py-1">
                          <Warehouse className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{warehouse.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {warehouse.location} • Available: {warehouse.available}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {fromWarehouseData && (
                <div className="p-3 rounded-lg bg-secondary text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {fromWarehouseData.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Available Capacity</span>
                    <span>{fromWarehouseData.available} units</span>
                  </div>
                </div>
              )}
            </div>

            {/* Transfer Arrow */}
            <div className="flex justify-center">
              <div className="p-2 rounded-full bg-primary/10">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
            </div>

            {/* To Warehouse */}
            <div className="space-y-2">
              <Label>To Warehouse (Destination)</Label>
              {isLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <Select value={toWarehouse} onValueChange={setToWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter(w => w.address !== fromWarehouse)
                      .map((warehouse) => (
                        <SelectItem key={warehouse.address} value={warehouse.address}>
                          <div className="flex items-center gap-2 py-1">
                            <Warehouse className="h-4 w-4" />
                            <div>
                              <div className="font-medium">{warehouse.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {warehouse.location} • Fee: {warehouse.fee_percentage}%
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              {toWarehouseData && (
                <div className="p-3 rounded-lg bg-secondary text-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {toWarehouseData.location}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Transfer Fee</span>
                    <span>{toWarehouseData.fee_percentage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Available Capacity</span>
                    <span>{toWarehouseData.available} units</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                <Package className="inline h-4 w-4 mr-1" />
                Transfer Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the quantity to transfer in commodity units
              </p>
            </div>

            {/* Cost Summary */}
            {toWarehouseData && transferQuantity > BigInt(0) && (
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transfer Quantity</span>
                  <span className="font-mono">{quantity}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Transfer Fee ({toWarehouseData.fee_percentage}%)</span>
                  <span className="font-mono">{formatEther(transferFee)}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between font-medium">
                  <span>Net Received</span>
                  <span className="font-mono">{formatEther(transferQuantity - transferFee)}</span>
                </div>
              </div>
            )}

            {/* Warnings */}
            {fromWarehouse === toWarehouse && fromWarehouse !== '' && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Source and destination warehouses must be different
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6 py-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Confirm Warehouse Transfer</AlertTitle>
              <AlertDescription>
                Review the transfer details carefully before proceeding.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {/* Transfer Summary */}
              <div className="grid grid-cols-3 gap-4">
                {/* From */}
                <div className="p-4 rounded-lg border">
                  <div className="text-sm font-medium mb-2">From</div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{fromWarehouseData?.name}</div>
                    <div className="text-muted-foreground">{fromWarehouseData?.location}</div>
                    <code className="text-xs">{fromWarehouse.slice(0, 10)}...</code>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center">
                  <ArrowRight className="h-8 w-8 text-primary" />
                </div>

                {/* To */}
                <div className="p-4 rounded-lg border border-primary">
                  <div className="text-sm font-medium mb-2">To</div>
                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{toWarehouseData?.name}</div>
                    <div className="text-muted-foreground">{toWarehouseData?.location}</div>
                    <code className="text-xs">{toWarehouse.slice(0, 10)}...</code>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 rounded-lg border space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Commodity</span>
                  <Badge>{selectedCommodity}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NFT Token ID</span>
                  <span className="font-mono text-sm">{tokenId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-mono">{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transfer Fee</span>
                  <span className="font-mono">{formatEther(transferFee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Net Amount</span>
                  <span className="font-mono">{formatEther(transferQuantity - transferFee)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            <p className="text-lg font-medium">Processing Transfer...</p>
            <p className="text-sm text-muted-foreground">Please wait while we initiate the warehouse transfer</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-lg font-medium">Transfer Initiated!</p>
            <p className="text-sm text-muted-foreground text-center">
              Your warehouse transfer has been initiated successfully.
              <br />
              The transfer will be processed and reflected in your position.
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
                disabled={
                  !fromWarehouse || 
                  !toWarehouse || 
                  !selectedCommodity || 
                  !quantity || 
                  !tokenId ||
                  fromWarehouse === toWarehouse
                }
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
              <Button onClick={handleTransfer}>
                Confirm Transfer
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
