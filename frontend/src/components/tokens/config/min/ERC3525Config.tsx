/**
 * Improved ERC3525 Simple Configuration Component
 * Uses centralized state management to eliminate validation issues
 * Based on working pattern from forms-comprehensive
 */
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ERC3525SimpleConfigProps } from "@/components/tokens/types";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

/**
 * Simple configuration component for ERC3525 (Semi-Fungible Token) tokens
 * Focuses on the core features needed to deploy an ERC-3525 contract
 * Uses centralized state management to prevent validation issues
 */
const ERC3525SimpleConfig: React.FC<ERC3525SimpleConfigProps> = ({ 
  tokenForm,
  handleInputChange,
  setTokenForm,
  onConfigChange,
  initialConfig = {} 
}) => {
  // Use centralized form state management
  const {
    formData,
    handleInputChange: handleInput,
    handleSwitchChange,
    handleSelectChange,
    handleFieldChange
  } = useMinConfigForm({
    tokenForm,
    initialConfig,
    onConfigChange,
    setTokenForm,
    handleInputChange
  });

  // Local state for slots - specific to ERC3525
  const [slots, setSlots] = useState(() => {
    const initialSlots = formData.slots || initialConfig.slots;
    if (Array.isArray(initialSlots) && initialSlots.length > 0) {
      return initialSlots;
    }
    return [{ id: "1", name: "Slot 1", description: "" }];
  });

  // Handle slot changes and update main form data
  const handleSlotChange = (index: number, field: string, value: string) => {
    const updatedSlots = [...slots];
    updatedSlots[index] = { ...updatedSlots[index], [field]: value };
    setSlots(updatedSlots);
    handleFieldChange("slots", updatedSlots);
  };

  // Add a new slot
  const addSlot = () => {
    const newId = (Math.max(...slots.map(s => parseInt(s.id) || 0), 0) + 1).toString();
    const newSlots = [...slots, { id: newId, name: `Slot ${newId}`, description: "" }];
    setSlots(newSlots);
    handleFieldChange("slots", newSlots);
  };

  // Remove a slot
  const removeSlot = (index: number) => {
    if (slots.length <= 1) {
      return; // Always keep at least one slot
    }
    const newSlots = slots.filter((_, i) => i !== index);
    setSlots(newSlots);
    handleFieldChange("slots", newSlots);
  };

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Basic Token Information */}
              <div>
                <h3 className="text-md font-medium mb-4">Basic Token Information</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="flex items-center">
                      Token Name
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The name of your ERC-3525 semi-fungible token</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Semi-Fungible Token"
                      value={formData.name || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="flex items-center">
                      Token Symbol
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The short symbol for your token (e.g., "SFT")</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="SFT"
                      value={formData.symbol || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="description" className="flex items-center">
                    Description
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">A brief description of your semi-fungible token</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A brief description of your ERC-3525 token"
                    value={formData.description || ""}
                    onChange={handleInput}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="decimals" className="flex items-center">
                      Decimals
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Number of decimal places for values (usually 18)</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="decimals"
                      name="decimals"
                      type="number"
                      placeholder="18"
                      value={formData.decimals ?? 18}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valueDecimals" className="flex items-center">
                      Value Decimals
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Number of decimal places for token values within slots</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="valueDecimals"
                      name="valueDecimals"
                      type="number"
                      placeholder="18"
                      value={formData.valueDecimals ?? 18}
                      onChange={handleInput}
                    />
                  </div>
                </div>
              </div>

              {/* Metadata Settings */}
              <div>
                <h3 className="text-md font-medium mb-4">Metadata Settings</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metadataStorage" className="flex items-center">
                      Metadata Storage
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Where your token metadata will be stored</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={formData.metadataStorage || "ipfs"} 
                      onValueChange={(value) => handleSelectChange("metadataStorage", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select storage method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ipfs">IPFS (Recommended)</SelectItem>
                        <SelectItem value="arweave">Arweave</SelectItem>
                        <SelectItem value="centralized">Centralized Server</SelectItem>
                        <SelectItem value="onchain">On-Chain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseUri" className="flex items-center">
                      Base URI
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The base URI for all token metadata. Token IDs will be appended to this URI.</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="baseUri"
                      name="baseUri"
                      placeholder="ipfs://..."
                      value={formData.baseUri || ""}
                      onChange={handleInput}
                    />
                    <p className="text-xs text-muted-foreground">
                      Can be set later if not available yet
                    </p>
                  </div>
                </div>
              </div>

              {/* Slots Section */}
              <div>
                <h3 className="text-md font-medium mb-4">
                  Token Slots
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Define categories for your semi-fungible tokens)
                  </span>
                </h3>
                
                <div className="space-y-4">
                  {slots.map((slot, index) => (
                    <div key={index} className="p-4 border rounded-md">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Slot ID: {slot.id}</h4>
                        {slots.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSlot(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`slotName-${index}`}>
                            Slot Name
                          </Label>
                          <Input
                            id={`slotName-${index}`}
                            value={slot.name}
                            onChange={(e) => handleSlotChange(index, "name", e.target.value)}
                            placeholder="e.g., Real Estate Bonds"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`slotDescription-${index}`}>
                            Description
                          </Label>
                          <Input
                            id={`slotDescription-${index}`}
                            value={slot.description}
                            onChange={(e) => handleSlotChange(index, "description", e.target.value)}
                            placeholder="Brief description of this slot"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={addSlot}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Slot
                  </Button>
                </div>
                
                <div className="mt-4 p-4 bg-muted/30 rounded-md">
                  <h4 className="text-sm font-medium mb-2">About ERC-3525 Slots</h4>
                  <p className="text-xs text-muted-foreground">
                    ERC-3525 tokens belong to different "slots" which act as categories. 
                    Tokens in the same slot are fungible with each other, but tokens in 
                    different slots are not. This enables use cases like tokenized bonds, 
                    real estate fractions, or carbon credits with different properties.
                  </p>
                </div>
              </div>

              {/* Advanced Features */}
              <div>
                <h3 className="text-md font-medium mb-4">Advanced Features</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Royalty Support</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable EIP-2981 royalty support for creator fees on secondary sales</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.hasRoyalty || false}
                      onCheckedChange={(checked) => handleSwitchChange("hasRoyalty", checked)}
                    />
                  </div>

                  {formData.hasRoyalty && (
                    <div className="pl-6 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="royaltyPercentage" className="flex items-center">
                          Royalty Percentage (%)
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">The percentage of the sale price that goes to the creator (e.g., 2.5 for 2.5%)</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="royaltyPercentage"
                          name="royaltyPercentage"
                          type="number"
                          placeholder="2.5"
                          value={formData.royaltyPercentage || "0"}
                          onChange={handleInput}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="royaltyReceiver" className="flex items-center">
                          Royalty Receiver Address
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">The Ethereum address that will receive royalty payments</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id="royaltyReceiver"
                          name="royaltyReceiver"
                          placeholder="0x..."
                          value={formData.royaltyReceiver || ""}
                          onChange={handleInput}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC3525SimpleConfig;
