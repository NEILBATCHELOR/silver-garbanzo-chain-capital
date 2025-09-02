import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Import our new UI components
import { SwitchField } from "./ui";

interface ERC3525BaseFormProps {
  config: any;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleSwitchChange: (name: string, checked: boolean) => void;
}

/**
 * ERC-3525 Base Form Component
 * Contains common token fields shared across all semi-fungible token configurations
 */
export const ERC3525BaseForm: React.FC<ERC3525BaseFormProps> = ({
  config,
  handleInputChange,
  handleSelectChange,
  handleSwitchChange,
}) => {
  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle>Semi-Fungible Token Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Token Information */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                Token Name *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Full name of the semi-fungible token</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Corporate Bond Portfolio"
                value={config.name || ""}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol" className="flex items-center">
                Token Symbol *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Ticker symbol for the semi-fungible token</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="CBP"
                value={config.symbol || ""}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center">
              Token Description
              <Tooltip>
                <TooltipTrigger className="ml-1.5">
                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Detailed description of the semi-fungible token and its purpose</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Description of the semi-fungible token, its slots, and use cases"
              value={config.description || ""}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Value Configuration */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valueDecimals" className="flex items-center">
                Value Decimals *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of decimal places for value calculations (0-18)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="valueDecimals"
                name="valueDecimals"
                type="number"
                min="0"
                max="18"
                placeholder="18"
                value={config.valueDecimals || 18}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slotType" className="flex items-center">
                Slot Type
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Type of slots this token will use</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={config.slotType || ""}
                onValueChange={(value) => handleSelectChange("slotType", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select slot type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generic">Generic</SelectItem>
                  <SelectItem value="financial">Financial Instrument</SelectItem>
                  <SelectItem value="bond">Bond</SelectItem>
                  <SelectItem value="derivative">Derivative</SelectItem>
                  <SelectItem value="equity">Equity Share</SelectItem>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="commodity">Commodity</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metadata Configuration */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Metadata Management</h4>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseUri" className="flex items-center">
                  Base URI
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Base URI for token metadata</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  id="baseUri"
                  name="baseUri"
                  placeholder="https://api.example.com/metadata/"
                  value={config.baseUri || ""}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadataStorage" className="flex items-center">
                  Metadata Storage
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Where token metadata will be stored</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select
                  value={config.metadataStorage || ""}
                  onValueChange={(value) => handleSelectChange("metadataStorage", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select metadata storage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ipfs">IPFS</SelectItem>
                    <SelectItem value="centralized">Centralized</SelectItem>
                    <SelectItem value="onchain">On-chain</SelectItem>
                    <SelectItem value="arweave">Arweave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-6">
              <SwitchField
                label="Dynamic Metadata"
                description="Allow metadata to change over time"
                checked={config.dynamicMetadata || false}
                onCheckedChange={(checked) => handleSwitchChange("dynamicMetadata", checked)}
              />

              <SwitchField
                label="Updatable URIs"
                description="Allow token URIs to be updated by authorized parties"
                checked={config.updatableUris || false}
                onCheckedChange={(checked) => handleSwitchChange("updatableUris", checked)}
              />
            </div>
          </div>

          {/* Access Control */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Access Control</h4>
            
            <div className="space-y-2">
              <Label htmlFor="accessControl" className="flex items-center">
                Access Control Model
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Access control mechanism for the token</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={config.accessControl || ""}
                onValueChange={(value) => handleSelectChange("accessControl", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access control model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ownable">Ownable</SelectItem>
                  <SelectItem value="roles">Role-based</SelectItem>
                  <SelectItem value="multisig">Multi-signature</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Basic Token Features */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Basic Features</h4>
            
            <div className="space-y-6">
              <SwitchField
                label="Burnable"
                description="Allow burning/destroying tokens to reduce supply"
                checked={config.isBurnable || false}
                onCheckedChange={(checked) => handleSwitchChange("isBurnable", checked)}
              />

              <SwitchField
                label="Pausable"
                description="Allow pausing all token transfers in emergencies"
                checked={config.isPausable || false}
                onCheckedChange={(checked) => handleSwitchChange("isPausable", checked)}
              />

              <SwitchField
                label="Royalty Support"
                description="Enable royalty payments on transfers (EIP-2981)"
                checked={config.hasRoyalty || false}
                onCheckedChange={(checked) => handleSwitchChange("hasRoyalty", checked)}
              />

              {config.hasRoyalty && (
                <div className="pl-6 space-y-4 border-l-2 border-primary/20">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="royaltyPercentage" className="flex items-center">
                        Royalty Percentage
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Percentage of sale price paid as royalty (0-100)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="royaltyPercentage"
                        name="royaltyPercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="2.5"
                        value={config.royaltyPercentage || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="royaltyReceiver" className="flex items-center">
                        Royalty Receiver
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Address that receives royalty payments</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="royaltyReceiver"
                        name="royaltyReceiver"
                        placeholder="0x..."
                        value={config.royaltyReceiver || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slot and Value Management */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Slot & Value Management</h4>
            
            <div className="space-y-6">
              <SwitchField
                label="Slot Enumeration"
                description="Allow enumeration of all slots"
                checked={config.allowsSlotEnumeration || false}
                onCheckedChange={(checked) => handleSwitchChange("allowsSlotEnumeration", checked)}
              />

              <SwitchField
                label="Slot Approvals"
                description="Enable approval mechanism for slot transfers"
                checked={config.slotApprovals || false}
                onCheckedChange={(checked) => handleSwitchChange("slotApprovals", checked)}
              />

              <SwitchField
                label="Value Approvals"
                description="Enable approval mechanism for value transfers"
                checked={config.valueApprovals || false}
                onCheckedChange={(checked) => handleSwitchChange("valueApprovals", checked)}
              />

              <SwitchField
                label="Value Transfers"
                description="Allow partial value transfers between tokens"
                checked={config.valueTransfersEnabled || false}
                onCheckedChange={(checked) => handleSwitchChange("valueTransfersEnabled", checked)}
              />

              <SwitchField
                label="Updatable Slots"
                description="Allow slot properties to be updated"
                checked={config.updatableSlots || false}
                onCheckedChange={(checked) => handleSwitchChange("updatableSlots", checked)}
              />

              <SwitchField
                label="Updatable Values"
                description="Allow token values to be updated"
                checked={config.updatableValues || false}
                onCheckedChange={(checked) => handleSwitchChange("updatableValues", checked)}
              />
            </div>
          </div>

          {/* Fractional and Aggregation Features */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Advanced Value Features</h4>
            
            <div className="space-y-6">
              <SwitchField
                label="Mergable Tokens"
                description="Allow tokens in the same slot to be merged"
                checked={config.mergable || false}
                onCheckedChange={(checked) => handleSwitchChange("mergable", checked)}
              />

              <SwitchField
                label="Splittable Tokens"
                description="Allow tokens to be split into multiple tokens"
                checked={config.splittable || false}
                onCheckedChange={(checked) => handleSwitchChange("splittable", checked)}
              />

              <SwitchField
                label="Value Aggregation"
                description="Enable aggregation of values across slots"
                checked={config.valueAggregation || false}
                onCheckedChange={(checked) => handleSwitchChange("valueAggregation", checked)}
              />

              <SwitchField
                label="Fractional Ownership"
                description="Enable fractional ownership of underlying assets"
                checked={config.fractionalOwnershipEnabled || false}
                onCheckedChange={(checked) => handleSwitchChange("fractionalOwnershipEnabled", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC3525BaseForm;
