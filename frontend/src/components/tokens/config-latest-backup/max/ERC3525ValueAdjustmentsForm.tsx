import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, PlusIcon, TrashIcon, CopyIcon, TriangleUpIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

interface ERC3525ValueAdjustment {
  id?: string;
  slotId: string;
  adjustmentDate: string;
  adjustmentType: string;
  adjustmentAmount: string;
  adjustmentReason?: string;
  oraclePrice?: string;
  oracleSource?: string;
  approvedBy?: string;
  transactionHash?: string;
}

interface ERC3525ValueAdjustmentsFormProps {
  config: any;
  valueAdjustments: ERC3525ValueAdjustment[];
  slots: ERC3525Slot[];
  onValueAdjustmentsChange: (adjustments: ERC3525ValueAdjustment[]) => void;
}

/**
 * ERC-3525 Value Adjustments Form Component
 * Manages value adjustments for semi-fungible tokens
 */
export const ERC3525ValueAdjustmentsForm: React.FC<ERC3525ValueAdjustmentsFormProps> = ({
  config,
  valueAdjustments,
  slots,
  onValueAdjustmentsChange,
}) => {
  const [expandedAdjustment, setExpandedAdjustment] = useState<number | null>(null);

  // Add new value adjustment
  const addValueAdjustment = () => {
    const newAdjustment: ERC3525ValueAdjustment = {
      slotId: slots.length > 0 ? slots[0].slotId : "",
      adjustmentDate: new Date().toISOString().slice(0, 16),
      adjustmentType: "mark_to_market",
      adjustmentAmount: "0",
      adjustmentReason: "",
      oraclePrice: "",
      oracleSource: "",
      approvedBy: "",
      transactionHash: ""
    };
    
    onValueAdjustmentsChange([...valueAdjustments, newAdjustment]);
    setExpandedAdjustment(valueAdjustments.length);
  };

  // Remove value adjustment
  const removeValueAdjustment = (index: number) => {
    const updatedAdjustments = valueAdjustments.filter((_, i) => i !== index);
    onValueAdjustmentsChange(updatedAdjustments);
    
    if (expandedAdjustment === index) {
      setExpandedAdjustment(null);
    } else if (expandedAdjustment && expandedAdjustment > index) {
      setExpandedAdjustment(expandedAdjustment - 1);
    }
  };

  // Duplicate value adjustment
  const duplicateValueAdjustment = (index: number) => {
    const adjustmentToDuplicate = valueAdjustments[index];
    const newAdjustment: ERC3525ValueAdjustment = {
      ...adjustmentToDuplicate,
      adjustmentDate: new Date().toISOString().slice(0, 16),
      transactionHash: ""
    };
    
    const updatedAdjustments = [...valueAdjustments];
    updatedAdjustments.splice(index + 1, 0, newAdjustment);
    onValueAdjustmentsChange(updatedAdjustments);
    setExpandedAdjustment(index + 1);
  };

  // Update value adjustment
  const updateValueAdjustment = (index: number, field: keyof ERC3525ValueAdjustment, value: any) => {
    const updatedAdjustments = valueAdjustments.map((adjustment, i) => 
      i === index ? { ...adjustment, [field]: value } : adjustment
    );
    onValueAdjustmentsChange(updatedAdjustments);
  };

  // Toggle adjustment expansion
  const toggleAdjustmentExpansion = (index: number) => {
    setExpandedAdjustment(expandedAdjustment === index ? null : index);
  };

  // Get slot by ID
  const getSlotById = (slotId: string) => {
    return slots.find(slot => slot.slotId === slotId);
  };

  // Calculate total adjustments by slot
  const getSlotTotalAdjustments = (slotId: string) => {
    return valueAdjustments
      .filter(adjustment => adjustment.slotId === slotId)
      .reduce((total, adjustment) => total + parseFloat(adjustment.adjustmentAmount || "0"), 0);
  };

  // Get adjustments by slot
  const getAdjustmentsBySlot = (slotId: string) => {
    return valueAdjustments.filter(adjustment => adjustment.slotId === slotId);
  };

  // Sort adjustments by date (most recent first)
  const sortedAdjustments = [...valueAdjustments].sort((a, b) => 
    new Date(b.adjustmentDate).getTime() - new Date(a.adjustmentDate).getTime()
  );

  // Get recent adjustments (last 7 days)
  const getRecentAdjustments = () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return valueAdjustments.filter(adjustment => 
      new Date(adjustment.adjustmentDate) >= sevenDaysAgo
    );
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Value Adjustments</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track and manage value adjustments for tokens (mark-to-market, revaluations, etc.)
              </p>
            </div>
            <Button 
              onClick={addValueAdjustment} 
              className="gap-2"
              disabled={slots.length === 0}
            >
              <PlusIcon className="h-4 w-4" />
              Add Adjustment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slots.length === 0 && (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertDescription>
                You need to define at least one slot before creating value adjustments. 
                Go to the Slots tab to create slots first.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Statistics */}
          {valueAdjustments.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <InfoCircledIcon className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-lg font-semibold text-blue-900">
                        {valueAdjustments.length}
                      </div>
                      <div className="text-xs text-blue-700">Total Adjustments</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <TriangleUpIcon className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-lg font-semibold text-green-900">
                        {valueAdjustments.filter(a => parseFloat(a.adjustmentAmount || "0") > 0).length}
                      </div>
                      <div className="text-xs text-green-700">Positive</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <TriangleDownIcon className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-lg font-semibold text-red-900">
                        {valueAdjustments.filter(a => parseFloat(a.adjustmentAmount || "0") < 0).length}
                      </div>
                      <div className="text-xs text-red-700">Negative</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <InfoCircledIcon className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-lg font-semibold text-orange-900">
                        {getRecentAdjustments().length}
                      </div>
                      <div className="text-xs text-orange-700">Recent (7 days)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {valueAdjustments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <TriangleUpIcon className="h-8 w-8" />
                </div>
                <h3 className="font-medium mb-2">No value adjustments defined</h3>
                <p className="text-sm">
                  Create value adjustments to track token value changes over time.
                </p>
              </div>
              {slots.length > 0 && (
                <Button onClick={addValueAdjustment} className="gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create First Value Adjustment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedAdjustments.map((adjustment, originalIndex) => {
                const index = valueAdjustments.findIndex(a => a === adjustment);
                const slot = getSlotById(adjustment.slotId);
                const isPositive = parseFloat(adjustment.adjustmentAmount || "0") > 0;
                const isNegative = parseFloat(adjustment.adjustmentAmount || "0") < 0;
                
                return (
                  <Card 
                    key={index} 
                    className={`border-l-4 ${
                      isPositive 
                        ? 'border-l-green-500' 
                        : isNegative 
                        ? 'border-l-red-500'
                        : 'border-l-gray-500'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleAdjustmentExpansion(index)}
                            className="p-1"
                          >
                            <div className={`transform transition-transform ${expandedAdjustment === index ? 'rotate-90' : ''}`}>
                              ▶
                            </div>
                          </Button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {adjustment.adjustmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </h4>
                              <Badge 
                                variant={isPositive ? "default" : isNegative ? "destructive" : "secondary"} 
                                className={`text-xs ${isPositive ? 'bg-green-600' : ''}`}
                              >
                                {isPositive ? '+' : ''}{adjustment.adjustmentAmount} {slot?.valueUnits || 'units'}
                              </Badge>
                              {slot && (
                                <Badge variant="outline" className="text-xs">
                                  {slot.slotName}
                                </Badge>
                              )}
                              {adjustment.oracleSource && (
                                <Badge variant="secondary" className="text-xs">
                                  Oracle: {adjustment.oracleSource}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(adjustment.adjustmentDate).toLocaleDateString()} at {new Date(adjustment.adjustmentDate).toLocaleTimeString()}
                              {adjustment.adjustmentReason && ` • ${adjustment.adjustmentReason.slice(0, 50)}${adjustment.adjustmentReason.length > 50 ? '...' : ''}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateValueAdjustment(index)}
                                className="p-2"
                              >
                                <CopyIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate adjustment</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeValueAdjustment(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove adjustment</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedAdjustment === index && (
                      <CardContent className="pt-0 space-y-6">
                        {/* Adjustment Details */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Adjustment Details</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`slotId-${index}`} className="flex items-center">
                                Slot *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Slot for which this adjustment applies</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={adjustment.slotId || ""}
                                onValueChange={(value) => updateValueAdjustment(index, 'slotId', value)}
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

                            <div className="space-y-2">
                              <Label htmlFor={`adjustmentType-${index}`} className="flex items-center">
                                Adjustment Type *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Type of value adjustment being applied</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={adjustment.adjustmentType || ""}
                                onValueChange={(value) => updateValueAdjustment(index, 'adjustmentType', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select adjustment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="mark_to_market">Mark to Market</SelectItem>
                                  <SelectItem value="revaluation">Revaluation</SelectItem>
                                  <SelectItem value="fair_value">Fair Value Adjustment</SelectItem>
                                  <SelectItem value="impairment">Impairment</SelectItem>
                                  <SelectItem value="appreciation">Appreciation</SelectItem>
                                  <SelectItem value="depreciation">Depreciation</SelectItem>
                                  <SelectItem value="dividend_reinvestment">Dividend Reinvestment</SelectItem>
                                  <SelectItem value="currency_adjustment">Currency Adjustment</SelectItem>
                                  <SelectItem value="accrual">Accrual</SelectItem>
                                  <SelectItem value="correction">Correction</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`adjustmentDate-${index}`} className="flex items-center">
                                Adjustment Date *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Date and time when adjustment was made</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`adjustmentDate-${index}`}
                                type="datetime-local"
                                value={adjustment.adjustmentDate}
                                onChange={(e) => updateValueAdjustment(index, 'adjustmentDate', e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`adjustmentAmount-${index}`} className="flex items-center">
                                Adjustment Amount *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Amount of the adjustment (positive for increases, negative for decreases)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  id={`adjustmentAmount-${index}`}
                                  type="number"
                                  step="0.000000000000000001"
                                  placeholder="100.00 or -50.00"
                                  value={adjustment.adjustmentAmount}
                                  onChange={(e) => updateValueAdjustment(index, 'adjustmentAmount', e.target.value)}
                                  required
                                />
                                {slot && slot.valueUnits && (
                                  <Badge variant="outline">{slot.valueUnits}</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`adjustmentReason-${index}`} className="flex items-center">
                              Adjustment Reason
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Explanation for the value adjustment</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Textarea
                              id={`adjustmentReason-${index}`}
                              placeholder="Explain the reason for this value adjustment..."
                              value={adjustment.adjustmentReason || ""}
                              onChange={(e) => updateValueAdjustment(index, 'adjustmentReason', e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>

                        <Separator />

                        {/* Oracle and Pricing Information */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Oracle & Pricing Information</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`oracleSource-${index}`} className="flex items-center">
                                Oracle Source
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Source of pricing data for this adjustment</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={adjustment.oracleSource || ""}
                                onValueChange={(value) => updateValueAdjustment(index, 'oracleSource', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select oracle source" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="chainlink">Chainlink</SelectItem>
                                  <SelectItem value="uniswap_v3">Uniswap V3</SelectItem>
                                  <SelectItem value="coingecko">CoinGecko</SelectItem>
                                  <SelectItem value="coinmarketcap">CoinMarketCap</SelectItem>
                                  <SelectItem value="bloomberg">Bloomberg</SelectItem>
                                  <SelectItem value="reuters">Reuters</SelectItem>
                                  <SelectItem value="manual">Manual Entry</SelectItem>
                                  <SelectItem value="internal">Internal Valuation</SelectItem>
                                  <SelectItem value="third_party">Third Party Appraisal</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`oraclePrice-${index}`} className="flex items-center">
                                Oracle Price
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Price from oracle at time of adjustment</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`oraclePrice-${index}`}
                                placeholder="1234.56"
                                value={adjustment.oraclePrice || ""}
                                onChange={(e) => updateValueAdjustment(index, 'oraclePrice', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Approval and Transaction Information */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Approval & Transaction</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`approvedBy-${index}`} className="flex items-center">
                                Approved By
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Address or name of who approved this adjustment</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`approvedBy-${index}`}
                                placeholder="0x... or Name"
                                value={adjustment.approvedBy || ""}
                                onChange={(e) => updateValueAdjustment(index, 'approvedBy', e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`transactionHash-${index}`} className="flex items-center">
                                Transaction Hash
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Blockchain transaction hash for the adjustment</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`transactionHash-${index}`}
                                placeholder="0x..."
                                value={adjustment.transactionHash || ""}
                                onChange={(e) => updateValueAdjustment(index, 'transactionHash', e.target.value)}
                              />
                            </div>
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
          {valueAdjustments.length > 0 && slots.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Value Adjustment Summary</span>
                    <Badge variant="outline">
                      {valueAdjustments.length} adjustment{valueAdjustments.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {slots.map((slot) => {
                      const slotAdjustments = getAdjustmentsBySlot(slot.slotId);
                      const totalAdjustment = getSlotTotalAdjustments(slot.slotId);
                      const positiveCount = slotAdjustments.filter(a => parseFloat(a.adjustmentAmount || "0") > 0).length;
                      const negativeCount = slotAdjustments.filter(a => parseFloat(a.adjustmentAmount || "0") < 0).length;
                      
                      return (
                        <div key={slot.slotId} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{slot.slotName}</span>
                              <Badge variant="outline" className="text-xs">{slot.slotId}</Badge>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${totalAdjustment > 0 ? 'text-green-600' : totalAdjustment < 0 ? 'text-red-600' : ''}`}>
                                {totalAdjustment > 0 ? '+' : ''}{totalAdjustment.toLocaleString()} {slot.valueUnits}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {slotAdjustments.length} adjustment{slotAdjustments.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          
                          {slotAdjustments.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="text-green-600">
                                ↗ {positiveCount} positive
                              </div>
                              <div className="text-red-600">
                                ↘ {negativeCount} negative
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Total Adjustments:</span>
                      <span className="font-medium">{valueAdjustments.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Net Change:</span>
                      <span className={`font-medium ${valueAdjustments.reduce((sum, a) => sum + parseFloat(a.adjustmentAmount || "0"), 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {valueAdjustments.reduce((sum, a) => sum + parseFloat(a.adjustmentAmount || "0"), 0) > 0 ? '+' : ''}
                        {valueAdjustments.reduce((sum, a) => sum + parseFloat(a.adjustmentAmount || "0"), 0).toLocaleString()}
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

export default ERC3525ValueAdjustmentsForm;
