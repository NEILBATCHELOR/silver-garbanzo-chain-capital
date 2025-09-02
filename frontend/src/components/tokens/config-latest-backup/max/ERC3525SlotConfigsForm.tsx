import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoCircledIcon, PlusIcon, TrashIcon, CopyIcon, GearIcon } from "@radix-ui/react-icons";
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

interface ERC3525SlotConfig {
  id?: string;
  slotId: string;
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
  valueUnits?: string;
  slotTransferable?: boolean;
}

interface ERC3525SlotConfigsFormProps {
  config: any;
  slotConfigs: ERC3525SlotConfig[];
  slots: ERC3525Slot[];
  onSlotConfigsChange: (configs: ERC3525SlotConfig[]) => void;
}

/**
 * ERC-3525 Slot Configurations Form Component
 * Manages additional configurations for slots
 */
export const ERC3525SlotConfigsForm: React.FC<ERC3525SlotConfigsFormProps> = ({
  config,
  slotConfigs,
  slots,
  onSlotConfigsChange,
}) => {
  const [expandedConfig, setExpandedConfig] = useState<number | null>(null);

  // Add new slot config
  const addSlotConfig = () => {
    const newConfig: ERC3525SlotConfig = {
      slotId: slots.length > 0 ? slots[0].slotId : "",
      name: "",
      description: "",
      metadata: {},
      valueUnits: "USD",
      slotTransferable: true
    };
    
    onSlotConfigsChange([...slotConfigs, newConfig]);
    setExpandedConfig(slotConfigs.length);
  };

  // Remove slot config
  const removeSlotConfig = (index: number) => {
    const updatedConfigs = slotConfigs.filter((_, i) => i !== index);
    onSlotConfigsChange(updatedConfigs);
    
    if (expandedConfig === index) {
      setExpandedConfig(null);
    } else if (expandedConfig && expandedConfig > index) {
      setExpandedConfig(expandedConfig - 1);
    }
  };

  // Duplicate slot config
  const duplicateSlotConfig = (index: number) => {
    const configToDuplicate = slotConfigs[index];
    const newConfig: ERC3525SlotConfig = {
      ...configToDuplicate,
      name: `${configToDuplicate.name} (Copy)`,
    };
    
    const updatedConfigs = [...slotConfigs];
    updatedConfigs.splice(index + 1, 0, newConfig);
    onSlotConfigsChange(updatedConfigs);
    setExpandedConfig(index + 1);
  };

  // Update slot config
  const updateSlotConfig = (index: number, field: keyof ERC3525SlotConfig, value: any) => {
    const updatedConfigs = slotConfigs.map((slotConfig, i) => 
      i === index ? { ...slotConfig, [field]: value } : slotConfig
    );
    onSlotConfigsChange(updatedConfigs);
  };

  // Update config metadata
  const updateConfigMetadata = (index: number, metadata: Record<string, any>) => {
    updateSlotConfig(index, 'metadata', metadata);
  };

  // Toggle config expansion
  const toggleConfigExpansion = (index: number) => {
    setExpandedConfig(expandedConfig === index ? null : index);
  };

  // Get slot by ID
  const getSlotById = (slotId: string) => {
    return slots.find(slot => slot.slotId === slotId);
  };

  // Get configs by slot
  const getConfigsBySlot = (slotId: string) => {
    return slotConfigs.filter(slotConfig => slotConfig.slotId === slotId);
  };

  // Check if slot already has a config
  const slotHasConfig = (slotId: string) => {
    return slotConfigs.some(slotConfig => slotConfig.slotId === slotId);
  };

  // Get unmatched slots (slots without configs)
  const getUnmatchedSlots = () => {
    return slots.filter(slot => !slotHasConfig(slot.slotId));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slot Configurations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Advanced configuration settings for individual slots
              </p>
            </div>
            <Button 
              onClick={addSlotConfig} 
              className="gap-2"
              disabled={slots.length === 0}
            >
              <PlusIcon className="h-4 w-4" />
              Add Config
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {slots.length === 0 && (
            <Alert>
              <InfoCircledIcon className="h-4 w-4" />
              <AlertDescription>
                You need to define at least one slot before creating slot configurations. 
                Go to the Slots tab to create slots first.
              </AlertDescription>
            </Alert>
          )}

          {/* Unmatched Slots Alert */}
          {slots.length > 0 && getUnmatchedSlots().length > 0 && (
            <Alert>
              <GearIcon className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>
                    {getUnmatchedSlots().length} slot{getUnmatchedSlots().length !== 1 ? 's' : ''} without configurations: {' '}
                    {getUnmatchedSlots().map(slot => slot.slotName).join(', ')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      getUnmatchedSlots().forEach(slot => {
                        const newConfig: ERC3525SlotConfig = {
                          slotId: slot.slotId,
                          name: `${slot.slotName} Config`,
                          description: `Configuration for ${slot.slotName}`,
                          metadata: {},
                          valueUnits: slot.valueUnits || "USD",
                          slotTransferable: slot.transferable ?? true
                        };
                        onSlotConfigsChange([...slotConfigs, newConfig]);
                      });
                    }}
                    className="ml-4"
                  >
                    Auto-create Configs
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {slotConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <GearIcon className="h-8 w-8" />
                </div>
                <h3 className="font-medium mb-2">No slot configurations defined</h3>
                <p className="text-sm">
                  Create configurations to customize slot behavior and properties.
                </p>
              </div>
              {slots.length > 0 && (
                <Button onClick={addSlotConfig} className="gap-2">
                  <PlusIcon className="h-4 w-4" />
                  Create First Configuration
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {slotConfigs.map((slotConfig, index) => {
                const slot = getSlotById(slotConfig.slotId);
                
                return (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleConfigExpansion(index)}
                            className="p-1"
                          >
                            <div className={`transform transition-transform ${expandedConfig === index ? 'rotate-90' : ''}`}>
                              ▶
                            </div>
                          </Button>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">
                                {slotConfig.name || `Config ${index + 1}`}
                              </h4>
                              <Badge variant="outline" className="text-xs">
                                {slotConfig.slotId}
                              </Badge>
                              {slot && (
                                <Badge variant="secondary" className="text-xs">
                                  {slot.slotName}
                                </Badge>
                              )}
                              {slotConfig.slotTransferable && (
                                <Badge variant="default" className="text-xs bg-green-600">
                                  Transferable
                                </Badge>
                              )}
                            </div>
                            {slotConfig.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {slotConfig.description}
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
                                onClick={() => duplicateSlotConfig(index)}
                                className="p-2"
                              >
                                <CopyIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate configuration</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSlotConfig(index)}
                                className="p-2 text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove configuration</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </CardHeader>

                    {expandedConfig === index && (
                      <CardContent className="pt-0 space-y-6">
                        {/* Basic Configuration */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Basic Configuration</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`slotId-${index}`} className="flex items-center">
                                Slot *
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Slot for which this configuration applies</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={slotConfig.slotId || ""}
                                onValueChange={(value) => updateSlotConfig(index, 'slotId', value)}
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
                                        {slotHasConfig(slot.slotId) && slot.slotId !== slotConfig.slotId && (
                                          <Badge variant="destructive" className="text-xs">
                                            Has Config
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`name-${index}`} className="flex items-center">
                                Configuration Name
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Name for this slot configuration</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Input
                                id={`name-${index}`}
                                placeholder="Bond Configuration"
                                value={slotConfig.name || ""}
                                onChange={(e) => updateSlotConfig(index, 'name', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`description-${index}`} className="flex items-center">
                              Description
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Description of this configuration's purpose</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Textarea
                              id={`description-${index}`}
                              placeholder="Describe the configuration settings and their purpose"
                              value={slotConfig.description || ""}
                              onChange={(e) => updateSlotConfig(index, 'description', e.target.value)}
                              rows={2}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`valueUnits-${index}`} className="flex items-center">
                                Value Units
                                <Tooltip>
                                  <TooltipTrigger className="ml-1.5">
                                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs">Units for value measurements in this configuration</p>
                                  </TooltipContent>
                                </Tooltip>
                              </Label>
                              <Select
                                value={slotConfig.valueUnits || ""}
                                onValueChange={(value) => updateSlotConfig(index, 'valueUnits', value)}
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
                                  <SelectItem value="basis_points">Basis Points</SelectItem>
                                  <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center justify-between pt-8">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium">Slot Transferable</span>
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
                                checked={slotConfig.slotTransferable ?? true}
                                onCheckedChange={(checked) => updateSlotConfig(index, 'slotTransferable', checked)}
                              />
                            </div>
                          </div>
                        </div>

                        <Separator />

                        {/* Metadata Configuration */}
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Metadata Configuration</h5>
                          
                          <div className="space-y-2">
                            <Label className="flex items-center">
                              Custom Metadata (JSON)
                              <Tooltip>
                                <TooltipTrigger className="ml-1.5">
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Additional metadata for this slot configuration</p>
                                </TooltipContent>
                              </Tooltip>
                            </Label>
                            <Textarea
                              placeholder={`{\n  "riskLevel": "low",\n  "minimumHolding": "30 days",\n  "liquidityTier": "A",\n  "custodian": "Bank of Example",\n  "regulatoryStatus": "approved"\n}`}
                              value={JSON.stringify(slotConfig.metadata || {}, null, 2)}
                              onChange={(e) => {
                                try {
                                  const metadata = JSON.parse(e.target.value);
                                  updateConfigMetadata(index, metadata);
                                } catch (error) {
                                  // Invalid JSON, don't update
                                }
                              }}
                              rows={6}
                              className="font-mono text-sm"
                            />
                          </div>

                          {/* Common Metadata Templates */}
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Quick Templates:</Label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfigMetadata(index, {
                                  ...slotConfig.metadata,
                                  riskLevel: "low",
                                  liquidityTier: "A",
                                  minimumHolding: "30 days"
                                })}
                              >
                                Low Risk Bond
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfigMetadata(index, {
                                  ...slotConfig.metadata,
                                  assetClass: "equity",
                                  votingRights: true,
                                  dividendEligible: true
                                })}
                              >
                                Equity Share
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfigMetadata(index, {
                                  ...slotConfig.metadata,
                                  assetType: "real_estate",
                                  propertyType: "commercial",
                                  location: "TBD"
                                })}
                              >
                                Real Estate
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateConfigMetadata(index, {
                                  ...slotConfig.metadata,
                                  instrumentType: "derivative",
                                  underlyingAsset: "TBD",
                                  settlementType: "cash"
                                })}
                              >
                                Derivative
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Slot Information Display */}
                        {slot && (
                          <div className="space-y-4">
                            <Separator />
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                              <h6 className="text-sm font-medium">Referenced Slot Information</h6>
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
                                  <span className="text-muted-foreground">Base Value Units:</span>
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
                                  <span className="text-muted-foreground">Base Features:</span>
                                  {slot.transferable !== false && <Badge variant="outline" className="text-xs">Transferable</Badge>}
                                  {slot.tradeable !== false && <Badge variant="outline" className="text-xs">Tradeable</Badge>}
                                  {slot.divisible !== false && <Badge variant="outline" className="text-xs">Divisible</Badge>}
                                </div>
                              </div>
                              
                              {/* Show differences between slot and config */}
                              {(slot.valueUnits !== slotConfig.valueUnits || slot.transferable !== slotConfig.slotTransferable) && (
                                <div className="pt-2 border-t">
                                  <div className="text-xs text-orange-600">
                                    ⚠ Configuration overrides: 
                                    {slot.valueUnits !== slotConfig.valueUnits && ` Value Units (${slot.valueUnits} → ${slotConfig.valueUnits})`}
                                    {slot.transferable !== slotConfig.slotTransferable && ` Transferability (${slot.transferable} → ${slotConfig.slotTransferable})`}
                                  </div>
                                </div>
                              )}
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

          {/* Summary */}
          {slotConfigs.length > 0 && slots.length > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Configuration Summary</span>
                    <Badge variant="outline">
                      {slotConfigs.length} config{slotConfigs.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="bg-background p-3 rounded-lg border">
                        <div className="text-lg font-semibold text-blue-600">{slots.length}</div>
                        <div className="text-xs text-muted-foreground">Total Slots</div>
                      </div>
                      <div className="bg-background p-3 rounded-lg border">
                        <div className="text-lg font-semibold text-green-600">{slotConfigs.length}</div>
                        <div className="text-xs text-muted-foreground">Configured</div>
                      </div>
                      <div className="bg-background p-3 rounded-lg border">
                        <div className="text-lg font-semibold text-orange-600">{getUnmatchedSlots().length}</div>
                        <div className="text-xs text-muted-foreground">Unconfigured</div>
                      </div>
                    </div>

                    {/* Value Units Distribution */}
                    <div className="bg-background p-3 rounded-lg border">
                      <div className="text-sm font-medium mb-2">Value Units Distribution:</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(slotConfigs.map(c => c.valueUnits).filter(Boolean))).map(unit => (
                          <Badge key={unit} variant="outline" className="text-xs">
                            {unit}: {slotConfigs.filter(c => c.valueUnits === unit).length}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Transferability Summary */}
                    <div className="bg-background p-3 rounded-lg border">
                      <div className="text-sm font-medium mb-2">Transferability:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-green-600">
                          ✓ {slotConfigs.filter(c => c.slotTransferable !== false).length} transferable
                        </div>
                        <div className="text-red-600">
                          ✗ {slotConfigs.filter(c => c.slotTransferable === false).length} non-transferable
                        </div>
                      </div>
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

export default ERC3525SlotConfigsForm;
