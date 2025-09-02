import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, PlusIcon, TrashIcon, CopyIcon, CalendarIcon, CheckCircledIcon } from "@radix-ui/react-icons";
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

interface ERC3525PaymentSchedule {
  id?: string;
  slotId: string;
  paymentDate: string;
  paymentAmount: string;
  paymentType: string;
  currency?: string;
  isCompleted?: boolean;
  transactionHash?: string;
}

interface ERC3525PaymentSchedulesFormProps {
  config: any;
  paymentSchedules: ERC3525PaymentSchedule[];
  slots: ERC3525Slot[];
  onPaymentSchedulesChange: (schedules: ERC3525PaymentSchedule[]) => void;
}

/**
 * ERC-3525 Payment Schedules Form Component
 * Manages payment schedules for semi-fungible tokens
 */
export const ERC3525PaymentSchedulesForm: React.FC<ERC3525PaymentSchedulesFormProps> = ({
  config,
  paymentSchedules,
  slots,
  onPaymentSchedulesChange,
}) => {
  const [expandedSchedule, setExpandedSchedule] = useState<number | null>(null);

  // Add new payment schedule
  const addPaymentSchedule = () => {
    const newSchedule: ERC3525PaymentSchedule = {
      slotId: slots.length > 0 ? slots[0].slotId : "",
      paymentDate: new Date().toISOString().slice(0, 16),
      paymentAmount: "0",
      paymentType: "coupon",
      currency: "USD",
      isCompleted: false,
      transactionHash: ""
    };
    
    onPaymentSchedulesChange([...paymentSchedules, newSchedule]);
    setExpandedSchedule(paymentSchedules.length);
  };

  // Remove payment schedule
  const removePaymentSchedule = (index: number) => {
    const updatedSchedules = paymentSchedules.filter((_, i) => i !== index);
    onPaymentSchedulesChange(updatedSchedules);
    
    if (expandedSchedule === index) {
      setExpandedSchedule(null);
    } else if (expandedSchedule && expandedSchedule > index) {
      setExpandedSchedule(expandedSchedule - 1);
    }
  };

  // Duplicate payment schedule
  const duplicatePaymentSchedule = (index: number) => {
    const scheduleToDuplicate = paymentSchedules[index];
    const newSchedule: ERC3525PaymentSchedule = {
      ...scheduleToDuplicate,
      paymentDate: new Date(new Date(scheduleToDuplicate.paymentDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // Add 30 days
      isCompleted: false,
      transactionHash: ""
    };
    
    const updatedSchedules = [...paymentSchedules];
    updatedSchedules.splice(index + 1, 0, newSchedule);
    onPaymentSchedulesChange(updatedSchedules);
    setExpandedSchedule(index + 1);
  };

  // Update payment schedule
  const updatePaymentSchedule = (index: number, field: keyof ERC3525PaymentSchedule, value: any) => {
    const updatedSchedules = paymentSchedules.map((schedule, i) => 
      i === index ? { ...schedule, [field]: value } : schedule
    );
    onPaymentSchedulesChange(updatedSchedules);
  };

  // Toggle schedule expansion
  const toggleScheduleExpansion = (index: number) => {
    setExpandedSchedule(expandedSchedule === index ? null : index);
  };

  // Get slot by ID
  const getSlotById = (slotId: string) => {
    return slots.find(slot => slot.slotId === slotId);
  };

  // Calculate total payments by slot
  const getSlotTotalPayments = (slotId: string) => {
    return paymentSchedules
      .filter(schedule => schedule.slotId === slotId)
      .reduce((total, schedule) => total + parseFloat(schedule.paymentAmount || "0"), 0);
  };

  // Get schedules by slot
  const getSchedulesBySlot = (slotId: string) => {
    return paymentSchedules.filter(schedule => schedule.slotId === slotId);
  };

  // Sort schedules by date
  const sortedSchedules = [...paymentSchedules].sort((a, b) => 
    new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
  );

  // Get upcoming schedules (next 30 days)
  const getUpcomingSchedules = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return paymentSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.paymentDate);
      return scheduleDate >= now && scheduleDate <= thirtyDaysFromNow && !schedule.isCompleted;
    });
  };

  // Get overdue schedules
  const getOverdueSchedules = () => {
    const now = new Date();
    return paymentSchedules.filter(schedule => {
      const scheduleDate = new Date(schedule.paymentDate);
      return scheduleDate < now && !schedule.isCompleted;
    });
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Schedules</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define payment schedules for token holders (coupons, dividends, etc.)
              </p>
            </div>
            <Button 
              onClick={addPaymentSchedule} 
              className="gap-2"
              disabled={slots.length === 0}
            >
              <PlusIcon className="h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slots.length === 0 && (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertDescription>
                You need to define at least one slot before creating payment schedules. 
                Go to the Slots tab to create slots first.
              </AlertDescription>
            </Alert>
          )}

          {/* Quick Status Overview */}
          {paymentSchedules.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="text-lg font-semibold text-orange-900">
                        {getUpcomingSchedules().length}
                      </div>
                      <div className="text-xs text-orange-700">Upcoming (30 days)</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 border-red-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <InfoCircledIcon className="h-4 w-4 text-red-600" />
                    <div>
                      <div className="text-lg font-semibold text-red-900">
                        {getOverdueSchedules().length}
                      </div>
                      <div className="text-xs text-red-700">Overdue</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircledIcon className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="text-lg font-semibold text-green-900">
                        {paymentSchedules.filter(s => s.isCompleted).length}
                      </div>
                      <div className="text-xs text-green-700">Completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {paymentSchedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="h-8 w-8" />
                </div>
                <h3 className="font-medium mb-2">No payment schedules defined</h3>
                <p className="text-sm">
                  Create payment schedules for automatic payments to token holders.
                </p>
              </div>
              {slots.length > 0 && (
                <Button onClick={addPaymentSchedule} className="gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create First Payment Schedule
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSchedules.map((schedule, originalIndex) => {
                const index = paymentSchedules.findIndex(s => s === schedule);
                const slot = getSlotById(schedule.slotId);
                const isOverdue = new Date(schedule.paymentDate) < new Date() && !schedule.isCompleted;
                const isUpcoming = new Date(schedule.paymentDate) > new Date() && new Date(schedule.paymentDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                
                return (
                  <Card 
                    key={index} 
                    className={`border-l-4 ${
                      schedule.isCompleted 
                        ? 'border-l-green-500' 
                        : isOverdue 
                        ? 'border-l-red-500'
                        : isUpcoming
                        ? 'border-l-orange-500'
                        : 'border-l-blue-500'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleScheduleExpansion(index)}
                            className="p-1"
                          >
                            <div className={`transform transition-transform ${expandedSchedule === index ? 'rotate-90' : ''}`}>
                              ▶
                            </div>
                          </Button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {schedule.paymentType.charAt(0).toUpperCase() + schedule.paymentType.slice(1)} Payment
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {schedule.paymentAmount} {schedule.currency}
                              </Badge>
                              {slot && (
                                <Badge variant="secondary" className="text-xs">
                                  {slot.slotName}
                                </Badge>
                              )}
                              {schedule.isCompleted && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Completed
                                </Badge>
                              )}
                              {isOverdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Overdue
                                </Badge>
                              )}
                              {isUpcoming && (
                                <Badge variant="secondary" className="text-xs bg-orange-600 text-white">
                                  Upcoming
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(schedule.paymentDate).toLocaleDateString()} at {new Date(schedule.paymentDate).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicatePaymentSchedule(index)}
                                className="p-2"
                              >
                                <CopyIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate schedule</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removePaymentSchedule(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove schedule</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedSchedule === index && (
                      <CardContent className="pt-0 space-y-6">
                        {/* Payment Details */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Payment Details</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`slotId-${index}`} className="flex items-center">
                                Slot *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Slot for which this payment is scheduled</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={schedule.slotId || ""}
                                onValueChange={(value) => updatePaymentSchedule(index, 'slotId', value)}
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
                              <Label htmlFor={`paymentType-${index}`} className="flex items-center">
                                Payment Type *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Type of payment being scheduled</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={schedule.paymentType || ""}
                                onValueChange={(value) => updatePaymentSchedule(index, 'paymentType', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="coupon">Coupon Payment</SelectItem>
                                  <SelectItem value="dividend">Dividend</SelectItem>
                                  <SelectItem value="interest">Interest Payment</SelectItem>
                                  <SelectItem value="principal">Principal Repayment</SelectItem>
                                  <SelectItem value="redemption">Redemption</SelectItem>
                                  <SelectItem value="distribution">Distribution</SelectItem>
                                  <SelectItem value="yield">Yield Payment</SelectItem>
                                  <SelectItem value="bonus">Bonus Payment</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`paymentDate-${index}`} className="flex items-center">
                                Payment Date *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Date and time when payment should be made</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`paymentDate-${index}`}
                                type="datetime-local"
                                value={schedule.paymentDate}
                                onChange={(e) => updatePaymentSchedule(index, 'paymentDate', e.target.value)}
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`paymentAmount-${index}`} className="flex items-center">
                                Payment Amount *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Amount to be paid per token</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <div className="flex items-center space-x-2">
                                <Input
                                  id={`paymentAmount-${index}`}
                                  type="number"
                                  step="0.000000000000000001"
                                  placeholder="100.00"
                                  value={schedule.paymentAmount}
                                  onChange={(e) => updatePaymentSchedule(index, 'paymentAmount', e.target.value)}
                                  required
                                />
                                <Select
                                  value={schedule.currency || ""}
                                  onValueChange={(value) => updatePaymentSchedule(index, 'currency', value)}
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue placeholder="Currency" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="EUR">EUR</SelectItem>
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="ETH">ETH</SelectItem>
                                    <SelectItem value="BTC">BTC</SelectItem>
                                    <SelectItem value="USDC">USDC</SelectItem>
                                    <SelectItem value="USDT">USDT</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Payment Status */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Payment Status</h5>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Payment Completed</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Mark as completed when payment has been processed</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={schedule.isCompleted || false}
                              onCheckedChange={(checked) => updatePaymentSchedule(index, 'isCompleted', checked)}
                            />
                          </div>

                          {schedule.isCompleted && (
                            <div className="space-y-2">
                              <Label htmlFor={`transactionHash-${index}`} className="flex items-center">
                                Transaction Hash
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Blockchain transaction hash for the payment</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`transactionHash-${index}`}
                                placeholder="0x..."
                                value={schedule.transactionHash || ""}
                                onChange={(e) => updatePaymentSchedule(index, 'transactionHash', e.target.value)}
                              />
                            </div>
                          )}
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
          {paymentSchedules.length > 0 && slots.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Payment Schedule Summary</span>
                    <Badge variant="outline">
                      {paymentSchedules.length} payment{paymentSchedules.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    {slots.map((slot) => {
                      const slotSchedules = getSchedulesBySlot(slot.slotId);
                      const totalPayments = getSlotTotalPayments(slot.slotId);
                      const completedCount = slotSchedules.filter(s => s.isCompleted).length;
                      
                      return (
                        <div key={slot.slotId} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{slot.slotName}</span>
                              <Badge variant="outline" className="text-xs">{slot.slotId}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{totalPayments.toLocaleString()} total</div>
                              <div className="text-xs text-muted-foreground">
                                {completedCount}/{slotSchedules.length} completed
                              </div>
                            </div>
                          </div>
                          
                          {slotSchedules.length > 0 && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-green-600">
                                ✓ {slotSchedules.filter(s => s.isCompleted).length} completed
                              </div>
                              <div className="text-orange-600">
                                ⏳ {slotSchedules.filter(s => {
                                  const date = new Date(s.paymentDate);
                                  return date > new Date() && date <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && !s.isCompleted;
                                }).length} upcoming
                              </div>
                              <div className="text-red-600">
                                ⚠ {slotSchedules.filter(s => new Date(s.paymentDate) < new Date() && !s.isCompleted).length} overdue
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Total Scheduled:</span>
                      <span className="font-medium">{paymentSchedules.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Total Amount:</span>
                      <span className="font-medium">
                        {paymentSchedules.reduce((sum, s) => sum + parseFloat(s.paymentAmount || "0"), 0).toLocaleString()}
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

export default ERC3525PaymentSchedulesForm;
