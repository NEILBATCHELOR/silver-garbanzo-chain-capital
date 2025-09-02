import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, PlusIcon, TrashIcon, CopyIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

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

interface ERC3525SlotsFormProps {
  config: any;
  slots: ERC3525Slot[];
  onSlotsChange: (slots: ERC3525Slot[]) => void;
}

/**
 * ERC-3525 Slots Form Component
 * Manages slot definitions for semi-fungible tokens
 */
export const ERC3525SlotsForm: React.FC<ERC3525SlotsFormProps> = ({
  config,
  slots,
  onSlotsChange,
}) => {
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null);

  // Add new slot
  const addSlot = () => {
    const newSlot: ERC3525Slot = {
      slotId: `slot_${slots.length + 1}`,
      slotName: `Slot ${slots.length + 1}`,
      slotDescription: "",
      valueUnits: "USD",
      slotType: "generic",
      transferable: true,
      tradeable: true,
      divisible: true,
      minValue: "0",
      maxValue: "",
      valuePrecision: 18,
      slotProperties: {}
    };
    
    onSlotsChange([...slots, newSlot]);
    setExpandedSlot(slots.length);
  };

  // Remove slot
  const removeSlot = (index: number) => {
    const updatedSlots = slots.filter((_, i) => i !== index);
    onSlotsChange(updatedSlots);
    
    if (expandedSlot === index) {
      setExpandedSlot(null);
    } else if (expandedSlot && expandedSlot > index) {
      setExpandedSlot(expandedSlot - 1);
    }
  };

  // Duplicate slot
  const duplicateSlot = (index: number) => {
    const slotToDuplicate = slots[index];
    const newSlot: ERC3525Slot = {
      ...slotToDuplicate,
      slotId: `${slotToDuplicate.slotId}_copy`,
      slotName: `${slotToDuplicate.slotName} (Copy)`,
    };
    
    const updatedSlots = [...slots];
    updatedSlots.splice(index + 1, 0, newSlot);
    onSlotsChange(updatedSlots);
    setExpandedSlot(index + 1);
  };

  // Update slot
  const updateSlot = (index: number, field: keyof ERC3525Slot, value: any) => {
    const updatedSlots = slots.map((slot, i) => 
      i === index ? { ...slot, [field]: value } : slot
    );
    onSlotsChange(updatedSlots);
  };

  // Update slot properties
  const updateSlotProperties = (index: number, properties: Record<string, any>) => {
    updateSlot(index, 'slotProperties', properties);
  };

  // Toggle slot expansion
  const toggleSlotExpansion = (index: number) => {
    setExpandedSlot(expandedSlot === index ? null : index);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slot Management</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define slots for organizing semi-fungible tokens by type or purpose
              </p>
            </div>
            <Button onClick={addSlot} className="gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Slot
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <PlusIcon className="h-8 w-8" />
                </div>
                <h3 className="font-medium mb-2">No slots defined</h3>
                <p className="text-sm">
                  ERC-3525 tokens require at least one slot to organize token types.
                </p>
              </div>
              <Button onClick={addSlot} className="gap-2">
                <PlusIcon className="h-4 w-4" />
                Create First Slot
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {slots.map((slot, index) => (
                <Card key={index} className="border-l-4 border-l-purple-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleSlotExpansion(index)}
                          className="p-1"
                        >
                          <div className={`transform transition-transform ${expandedSlot === index ? 'rotate-90' : ''}`}>
                            ▶
                          </div>
                        </Button>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{slot.slotName || `Slot ${index + 1}`}</h4>
                            <Badge variant="outline" className="text-xs">
                              {slot.slotId}
                            </Badge>
                            {slot.slotType && (
                              <Badge variant="secondary" className="text-xs">
                                {slot.slotType}
                              </Badge>
                            )}
                          </div>
                          {slot.slotDescription && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {slot.slotDescription}
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
                              onClick={() => duplicateSlot(index)}
                              className="p-2"
                            >
                              <CopyIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate slot</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSlot(index)}
                              className="p-2 text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove slot</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSlot === index && (
                    <CardContent className="pt-0 space-y-6">
                      {/* Basic Slot Information */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Basic Information</h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`slotId-${index}`} className="flex items-center">
                              Slot ID *
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Unique identifier for this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`slotId-${index}`}
                              placeholder="slot_1"
                              value={slot.slotId}
                              onChange={(e) => updateSlot(index, 'slotId', e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`slotName-${index}`} className="flex items-center">
                              Slot Name *
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Human-readable name for this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`slotName-${index}`}
                              placeholder="Corporate Bond Slot"
                              value={slot.slotName}
                              onChange={(e) => updateSlot(index, 'slotName', e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`slotDescription-${index}`} className="flex items-center">
                            Description
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Description of what this slot represents</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Textarea
                            id={`slotDescription-${index}`}
                            placeholder="Describe the purpose and characteristics of this slot"
                            value={slot.slotDescription || ""}
                            onChange={(e) => updateSlot(index, 'slotDescription', e.target.value)}
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`slotType-${index}`} className="flex items-center">
                              Slot Type
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Type category for this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Select
                              value={slot.slotType || ""}
                              onValueChange={(value) => updateSlot(index, 'slotType', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select slot type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="generic">Generic</SelectItem>
                                <SelectItem value="bond">Bond</SelectItem>
                                <SelectItem value="equity">Equity</SelectItem>
                                <SelectItem value="derivative">Derivative</SelectItem>
                                <SelectItem value="commodity">Commodity</SelectItem>
                                <SelectItem value="real_estate">Real Estate</SelectItem>
                                <SelectItem value="art">Art & Collectibles</SelectItem>
                                <SelectItem value="carbon_credit">Carbon Credit</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`valueUnits-${index}`} className="flex items-center">
                              Value Units
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Units for measuring token values in this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Select
                              value={slot.valueUnits || ""}
                              onValueChange={(value) => updateSlot(index, 'valueUnits', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select value units" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="USD">USD</SelectItem>
                                <SelectItem value="EUR">EUR</SelectItem>
                                <SelectItem value="GBP">GBP</SelectItem>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="BTC">BTC</SelectItem>
                                <SelectItem value="shares">Shares</SelectItem>
                                <SelectItem value="units">Units</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Value Configuration */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Value Configuration</h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={`minValue-${index}`} className="flex items-center">
                              Minimum Value
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Minimum value for tokens in this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`minValue-${index}`}
                              placeholder="0"
                              value={slot.minValue || ""}
                              onChange={(e) => updateSlot(index, 'minValue', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`maxValue-${index}`} className="flex items-center">
                              Maximum Value
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Maximum value for tokens in this slot (optional)</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`maxValue-${index}`}
                              placeholder="No limit"
                              value={slot.maxValue || ""}
                              onChange={(e) => updateSlot(index, 'maxValue', e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`valuePrecision-${index}`} className="flex items-center">
                              Value Precision
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Number of decimal places for value calculations</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Input
                              id={`valuePrecision-${index}`}
                              type="number"
                              min="0"
                              max="18"
                              placeholder="18"
                              value={slot.valuePrecision || 18}
                              onChange={(e) => updateSlot(index, 'valuePrecision', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Slot Features */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Slot Features</h5>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Transferable</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Allow tokens in this slot to be transferred</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={slot.transferable ?? true}
                              onCheckedChange={(checked) => updateSlot(index, 'transferable', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Tradeable</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Allow tokens in this slot to be traded on marketplaces</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={slot.tradeable ?? true}
                              onCheckedChange={(checked) => updateSlot(index, 'tradeable', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Divisible</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Allow partial value transfers from tokens in this slot</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={slot.divisible ?? true}
                              onCheckedChange={(checked) => updateSlot(index, 'divisible', checked)}
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Custom Properties */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Custom Properties</h5>
                        
                        <div className="space-y-2">
                          <Label className="flex items-center">
                            Custom Properties (JSON)
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Additional custom properties for this slot in JSON format</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Textarea
                            placeholder={`{\n  "category": "fixed_income",\n  "maturity": "2025-12-31",\n  "rating": "AAA"\n}`}
                            value={JSON.stringify(slot.slotProperties || {}, null, 2)}
                            onChange={(e) => {
                              try {
                                const properties = JSON.parse(e.target.value);
                                updateSlotProperties(index, properties);
                              } catch (error) {
                                // Invalid JSON, don't update
                              }
                            }}
                            rows={4}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Summary */}
          {slots.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Slot Summary</span>
                    <Badge variant="outline">{slots.length} slot{slots.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>• Transferable slots: {slots.filter(s => s.transferable !== false).length}</div>
                    <div>• Tradeable slots: {slots.filter(s => s.tradeable !== false).length}</div>
                    <div>• Divisible slots: {slots.filter(s => s.divisible !== false).length}</div>
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

export default ERC3525SlotsForm;
