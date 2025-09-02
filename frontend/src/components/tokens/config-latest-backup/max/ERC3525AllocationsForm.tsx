import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, PlusIcon, TrashIcon, CopyIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ERC3525Slot {
  id?: string;
  slotId: string;
  slotName: string;
  slotDescription?: string;
  valueUnits?: string;
  slotType?: string;
  transferable?: boolean;
  tradeable?: boolean;
  divisible?: boolean;
  minValue?: string;
  maxValue?: string;
  valuePrecision?: number;
  slotProperties?: Record<string, any>;
}

interface ERC3525Allocation {
  id?: string;
  tokenIdWithinSlot: string;
  slotId: string;
  recipient: string;
  value: string;
  linkedTokenId?: string;
}

interface ERC3525AllocationsFormProps {
  config: any;
  allocations: ERC3525Allocation[];
  slots: ERC3525Slot[];
  onAllocationsChange: (allocations: ERC3525Allocation[]) => void;
}

/**
 * ERC-3525 Allocations Form Component
 * Manages token allocations within slots
 */
export const ERC3525AllocationsForm: React.FC<ERC3525AllocationsFormProps> = ({
  config,
  allocations,
  slots,
  onAllocationsChange,
}) => {
  const [expandedAllocation, setExpandedAllocation] = useState<number | null>(null);

  // Add new allocation
  const addAllocation = () => {
    const newAllocation: ERC3525Allocation = {
      tokenIdWithinSlot: `token_${allocations.length + 1}`,
      slotId: slots.length > 0 ? slots[0].slotId : "",
      recipient: "",
      value: "0",
      linkedTokenId: ""
    };
    
    onAllocationsChange([...allocations, newAllocation]);
    setExpandedAllocation(allocations.length);
  };

  // Remove allocation
  const removeAllocation = (index: number) => {
    const updatedAllocations = allocations.filter((_, i) => i !== index);
    onAllocationsChange(updatedAllocations);
    
    if (expandedAllocation === index) {
      setExpandedAllocation(null);
    } else if (expandedAllocation && expandedAllocation > index) {
      setExpandedAllocation(expandedAllocation - 1);
    }
  };

  // Duplicate allocation
  const duplicateAllocation = (index: number) => {
    const allocationToDuplicate = allocations[index];
    const newAllocation: ERC3525Allocation = {
      ...allocationToDuplicate,
      tokenIdWithinSlot: `${allocationToDuplicate.tokenIdWithinSlot}_copy`,
      recipient: "", // Clear recipient for manual entry
    };
    
    const updatedAllocations = [...allocations];
    updatedAllocations.splice(index + 1, 0, newAllocation);
    onAllocationsChange(updatedAllocations);
    setExpandedAllocation(index + 1);
  };

  // Update allocation
  const updateAllocation = (index: number, field: keyof ERC3525Allocation, value: any) => {
    const updatedAllocations = allocations.map((allocation, i) => 
      i === index ? { ...allocation, [field]: value } : allocation
    );
    onAllocationsChange(updatedAllocations);
  };

  // Toggle allocation expansion
  const toggleAllocationExpansion = (index: number) => {
    setExpandedAllocation(expandedAllocation === index ? null : index);
  };

  // Get slot by ID
  const getSlotById = (slotId: string) => {
    return slots.find(slot => slot.slotId === slotId);
  };

  // Calculate total value per slot
  const getSlotTotalValue = (slotId: string) => {
    return allocations
      .filter(allocation => allocation.slotId === slotId)
      .reduce((total, allocation) => total + parseFloat(allocation.value || "0"), 0);
  };

  // Get allocations by slot
  const getAllocationsBySlot = (slotId: string) => {
    return allocations.filter(allocation => allocation.slotId === slotId);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Token Allocations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define how tokens are allocated within slots to recipients
              </p>
            </div>
            <Button 
              onClick={addAllocation} 
              className="gap-2"
              disabled={slots.length === 0}
            >
              <PlusIcon className="h-4 w-4" />
              Add Allocation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slots.length === 0 && (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertDescription>
                You need to define at least one slot before creating allocations. 
                Go to the Slots tab to create slots first.
              </AlertDescription>
            </Alert>
          )}

          {allocations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlusIcon className="h-8 w-8" />
                </div>
                <h3 className="font-medium mb-2">No allocations defined</h3>
                <p className="text-sm">
                  Create allocations to distribute token values to recipients within slots.
                </p>
              </div>
              {slots.length > 0 && (
                <Button onClick={addAllocation} className="gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create First Allocation
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {allocations.map((allocation, index) => {
                const slot = getSlotById(allocation.slotId);
                
                return (
                  <Card key={index} className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAllocationExpansion(index)}
                            className="p-1"
                          >
                            <div className={`transform transition-transform ${expandedAllocation === index ? 'rotate-90' : ''}`}>
                              ▶
                            </div>
                          </Button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {allocation.tokenIdWithinSlot || `Allocation ${index + 1}`}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {allocation.value} {slot?.valueUnits || 'units'}
                              </Badge>
                              {slot && (
                                <Badge variant="secondary" className="text-xs">
                                  {slot.slotName}
                                </Badge>
                              )}
                            </div>
                            {allocation.recipient && (
                              <p className="text-sm text-muted-foreground mt-1">
                                → {allocation.recipient.slice(0, 10)}...{allocation.recipient.slice(-8)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateAllocation(index)}
                                className="p-2"
                              >
                                <CopyIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate allocation</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeAllocation(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove allocation</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedAllocation === index && (
                      <CardContent className="pt-0 space-y-6">
                        {/* Basic Allocation Information */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Allocation Details</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`tokenIdWithinSlot-${index}`} className="flex items-center">
                                Token ID Within Slot *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Unique token identifier within the selected slot</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`tokenIdWithinSlot-${index}`}
                                placeholder="token_1"
                                value={allocation.tokenIdWithinSlot}
                                onChange={(e) => updateAllocation(index, 'tokenIdWithinSlot', e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`slotId-${index}`} className="flex items-center">
                                Slot *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Slot where this token will be allocated</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={allocation.slotId || ""}
                                onValueChange={(value) => updateAllocation(index, 'slotId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a slot" />
                                </SelectTrigger>
                                <SelectContent>
                                  {slots.map((slot) => (
                                    <SelectItem key={slot.slotId} value={slot.slotId}>
                                      <div className="flex items-center space-x-2">
                                        <span>{slot.slotName}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {slot.slotId}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`recipient-${index}`} className="flex items-center">
                                Recipient Address *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Wallet address that will receive this token allocation</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`recipient-${index}`}
                                placeholder="0x..."
                                value={allocation.recipient}
                                onChange={(e) => updateAllocation(index, 'recipient', e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`value-${index}`} className="flex items-center">
                                Value *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Value amount for this token allocation</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  id={`value-${index}`}
                                  type="number"
                                  step="0.000000000000000001"
                                  placeholder="1000"
                                  value={allocation.value}
                                  onChange={(e) => updateAllocation(index, 'value', e.target.value)}
                                  required
                                />
                                {slot && slot.valueUnits && (
                                  <Badge variant="outline">{slot.valueUnits}</Badge>
                                )}
                              </div>
                              {slot && slot.minValue && parseFloat(allocation.value || "0") < parseFloat(slot.minValue) && (
                                <p className="text-sm text-red-600">
                                  Value must be at least {slot.minValue} {slot.valueUnits}
                                </p>
                              )}
                              {slot && slot.maxValue && parseFloat(allocation.value || "0") > parseFloat(slot.maxValue) && (
                                <p className="text-sm text-red-600">
                                  Value cannot exceed {slot.maxValue} {slot.valueUnits}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`linkedTokenId-${index}`} className="flex items-center">
                              Linked Token ID
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Optional: Link to another token for complex relationships</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`linkedTokenId-${index}`}
                              placeholder="Optional linked token UUID"
                              value={allocation.linkedTokenId || ""}
                              onChange={(e) => updateAllocation(index, 'linkedTokenId', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Slot Information Display */}
                        {slot && (
                          <div className="space-y-4">
                            <Separator />
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                              <h6 className="text-sm font-medium">Slot Information</h6>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Name:</span>
                                  <span className="ml-2">{slot.slotName}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Type:</span>
                                  <span className="ml-2">{slot.slotType || 'Generic'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Value Units:</span>
                                  <span className="ml-2">{slot.valueUnits || 'Units'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Precision:</span>
                                  <span className="ml-2">{slot.valuePrecision || 18} decimals</span>
                                </div>
                                {slot.minValue && (
                                  <div>
                                    <span className="text-muted-foreground">Min Value:</span>
                                    <span className="ml-2">{slot.minValue}</span>
                                  </div>
                                )}
                                {slot.maxValue && (
                                  <div>
                                    <span className="text-muted-foreground">Max Value:</span>
                                    <span className="ml-2">{slot.maxValue}</span>
                                  </div>
                                )}
                              </div>
                              <div className="pt-2 border-t">
                                <div className="flex items-center space-x-4 text-sm">
                                  <span className="text-muted-foreground">Features:</span>
                                  {slot.transferable !== false && <Badge variant="outline" className="text-xs">Transferable</Badge>}
                                  {slot.tradeable !== false && <Badge variant="outline" className="text-xs">Tradeable</Badge>}
                                  {slot.divisible !== false && <Badge variant="outline" className="text-xs">Divisible</Badge>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Summary by Slot */}
          {allocations.length > 0 && slots.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Allocation Summary</span>
                    <Badge variant="outline">{allocations.length} allocation{allocations.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {slots.map((slot) => {
                      const slotAllocations = getAllocationsBySlot(slot.slotId);
                      const totalValue = getSlotTotalValue(slot.slotId);
                      
                      return (
                        <div key={slot.slotId} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{slot.slotName}</span>
                              <Badge variant="outline" className="text-xs">{slot.slotId}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{totalValue.toLocaleString()} {slot.valueUnits}</div>
                              <div className="text-xs text-muted-foreground">
                                {slotAllocations.length} allocation{slotAllocations.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          
                          {slotAllocations.length > 0 && (
                            <div className="space-y-1">
                              {slotAllocations.slice(0, 3).map((allocation, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{allocation.tokenIdWithinSlot}</span>
                                  <span>{allocation.value} → {allocation.recipient.slice(0, 6)}...{allocation.recipient.slice(-4)}</span>
                                </div>
                              ))}
                              {slotAllocations.length > 3 && (
                                <div className="text-xs text-muted-foreground text-center">
                                  +{slotAllocations.length - 3} more allocation{slotAllocations.length - 3 !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Total Allocations:</span>
                      <span className="font-medium">{allocations.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Unique Recipients:</span>
                      <span className="font-medium">
                        {new Set(allocations.map(a => a.recipient).filter(r => r)).size}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC3525AllocationsForm;
