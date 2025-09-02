/**
 * Improved ERC1400 Simple Configuration Component
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
import { ERC1400SimpleConfigProps } from "@/components/tokens/types";
import { useMinConfigForm } from "../../hooks/useMinConfigForm";

/**
 * Simple configuration component for ERC1400 (Security Token) tokens
 * Focuses on the core features needed to deploy a security token
 * Uses centralized state management to prevent validation issues
 */
const ERC1400SimpleConfig: React.FC<ERC1400SimpleConfigProps> = ({ 
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

  // Local state for partitions - specific to ERC1400
  const [partitions, setPartitions] = useState(() => {
    const initialPartitions = formData.partitions || initialConfig.partitions;
    if (Array.isArray(initialPartitions) && initialPartitions.length > 0) {
      return initialPartitions;
    }
    return formData.isMultiClass ? [{ name: "Default Partition", amount: "" }] : [];
  });

  // Local state for controllers - specific to ERC1400
  const [controllers, setControllers] = useState(() => {
    const initialControllers = formData.controllers || initialConfig.controllers;
    if (Array.isArray(initialControllers) && initialControllers.length > 0) {
      return initialControllers;
    }
    return [""];
  });

  // Handle partition changes and update main form data
  const handlePartitionChange = (index: number, field: string, value: string) => {
    const updatedPartitions = [...partitions];
    updatedPartitions[index] = { ...updatedPartitions[index], [field]: value };
    setPartitions(updatedPartitions);
    handleFieldChange("partitions", updatedPartitions);
  };

  // Add a new partition
  const addPartition = () => {
    const newPartitions = [...partitions, { name: "", amount: "" }];
    setPartitions(newPartitions);
    handleFieldChange("partitions", newPartitions);
  };

  // Remove a partition
  const removePartition = (index: number) => {
    const newPartitions = partitions.filter((_, i) => i !== index);
    setPartitions(newPartitions);
    handleFieldChange("partitions", newPartitions);
  };

  // Handle controller changes and update main form data
  const handleControllerChange = (index: number, value: string) => {
    const updatedControllers = [...controllers];
    updatedControllers[index] = value;
    setControllers(updatedControllers);
    handleFieldChange("controllers", updatedControllers);
  };

  // Add a new controller
  const addController = () => {
    const newControllers = [...controllers, ""];
    setControllers(newControllers);
    handleFieldChange("controllers", newControllers);
  };

  // Remove a controller
  const removeController = (index: number) => {
    if (controllers.length <= 1) {
      return; // Always keep at least one controller field
    }
    const newControllers = controllers.filter((_, i) => i !== index);
    setControllers(newControllers);
    handleFieldChange("controllers", newControllers);
  };

  // Handle multi-class toggle and automatically manage partitions
  const handleMultiClassChange = (checked: boolean) => {
    handleSwitchChange("isMultiClass", checked);
    
    if (checked && partitions.length === 0) {
      const defaultPartitions = [{ name: "Default Partition", amount: "" }];
      setPartitions(defaultPartitions);
      handleFieldChange("partitions", defaultPartitions);
    } else if (!checked) {
      setPartitions([]);
      handleFieldChange("partitions", []);
    }
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
                          <p className="max-w-xs">The name of your security token</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Security Token"
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
                          <p className="max-w-xs">The short symbol for your token (e.g., "MST")</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="symbol"
                      name="symbol"
                      placeholder="MST"
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
                        <p className="max-w-xs">A brief description of your security token</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A brief description of your security token"
                    value={formData.description || ""}
                    onChange={handleInput}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="decimals" className="flex items-center">
                      Decimals
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Number of decimal places (usually 18)</p>
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
                    <Label htmlFor="initialSupply" className="flex items-center">
                      Initial Supply
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">The initial number of tokens to mint</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="initialSupply"
                      name="initialSupply"
                      placeholder="1000000"
                      value={formData.initialSupply || ""}
                      onChange={handleInput}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cap" className="flex items-center">
                      Maximum Supply (Optional)
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Maximum number of tokens that can ever exist</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="cap"
                      name="cap"
                      placeholder="10000000"
                      value={formData.cap || ""}
                      onChange={handleInput}
                    />
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="issuingJurisdiction" className="flex items-center">
                    Issuing Jurisdiction
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">The legal jurisdiction where this security token is issued</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="issuingJurisdiction"
                    name="issuingJurisdiction"
                    placeholder="e.g., Delaware, USA"
                    value={formData.issuingJurisdiction || ""}
                    onChange={handleInput}
                  />
                </div>
              </div>

              {/* Security Token Features */}
              <div>
                <h3 className="text-md font-medium mb-4">Security Token Features</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Issuable</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow authorized parties to issue new tokens</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isIssuable ?? true}
                      onCheckedChange={(checked) => handleSwitchChange("isIssuable", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Multi-Class (Partitions)</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable multiple token classes with different properties</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.isMultiClass || false}
                      onCheckedChange={handleMultiClassChange}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Transfer Restrictions</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Enable compliance-based transfer restrictions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.transferRestrictions ?? true}
                      onCheckedChange={(checked) => handleSwitchChange("transferRestrictions", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Tranche Transferability</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Allow transfers between different token partitions</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Switch
                      checked={formData.trancheTransferability || false}
                      onCheckedChange={(checked) => handleSwitchChange("trancheTransferability", checked)}
                    />
                  </div>
                </div>
              </div>

              {/* Partitions Section (only show if multi-class is enabled) */}
              {formData.isMultiClass && (
                <div>
                  <h3 className="text-md font-medium mb-4">
                    Token Partitions
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      (Define different token classes)
                    </span>
                  </h3>
                  
                  <div className="space-y-3">
                    {partitions.map((partition, index) => (
                      <div key={index} className="p-4 border rounded-md">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">Partition {index + 1}</h4>
                          {partitions.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePartition(index)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`partitionName-${index}`}>
                              Partition Name
                            </Label>
                            <Input
                              id={`partitionName-${index}`}
                              value={partition.name}
                              onChange={(e) => handlePartitionChange(index, "name", e.target.value)}
                              placeholder="e.g., Class A Shares"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`partitionAmount-${index}`}>
                              Initial Amount
                            </Label>
                            <Input
                              id={`partitionAmount-${index}`}
                              type="number"
                              value={partition.amount}
                              onChange={(e) => handlePartitionChange(index, "amount", e.target.value)}
                              placeholder="100000"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={addPartition}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Partition
                    </Button>
                  </div>
                </div>
              )}

              {/* Controllers Section */}
              <div>
                <h3 className="text-md font-medium mb-4">
                  Token Controllers
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    (Addresses authorized to control token operations)
                  </span>
                </h3>
                
                <div className="space-y-3">
                  {controllers.map((controller, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={controller}
                        onChange={(e) => handleControllerChange(index, e.target.value)}
                        placeholder="0x... Controller Address"
                        className="flex-1"
                      />
                      {controllers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeController(index)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={addController}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Controller
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
};

export default ERC1400SimpleConfig;
