import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Partition {
  id?: string;
  name: string;
  partitionId: string;
  amount: string;
  partitionType: string;
  transferable: boolean;
  corporateActions: boolean;
  metadata?: any;
  customFeatures?: any;
}

interface ERC1400PartitionsFormProps {
  config: any;
  partitions: Partition[];
  onPartitionsChange: (partitions: Partition[]) => void;
}

/**
 * ERC-1400 Partitions Form Component
 * Manages token partitions/tranches for multi-class securities
 */
export const ERC1400PartitionsForm: React.FC<ERC1400PartitionsFormProps> = ({
  config,
  partitions,
  onPartitionsChange,
}) => {
  // Add a new partition
  const addPartition = () => {
    const newPartition: Partition = {
      name: `Partition ${partitions.length + 1}`,
      partitionId: `PART${partitions.length + 1}`,
      amount: "",
      partitionType: "common",
      transferable: true,
      corporateActions: false,
      metadata: {},
      customFeatures: {}
    };
    onPartitionsChange([...partitions, newPartition]);
  };

  // Remove a partition
  const removePartition = (index: number) => {
    const updatedPartitions = partitions.filter((_, i) => i !== index);
    onPartitionsChange(updatedPartitions);
  };

  // Update a partition
  const updatePartition = (index: number, field: keyof Partition, value: any) => {
    const updatedPartitions = partitions.map((partition, i) => 
      i === index ? { ...partition, [field]: value } : partition
    );
    onPartitionsChange(updatedPartitions);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            Token Partitions
            <Badge variant="outline" className="ml-2">
              {partitions.length} partition{partitions.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button onClick={addPartition} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Partition
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Partitions allow different classes or tranches of tokens with distinct properties and restrictions.
            Each partition can have its own supply allocation and transfer rules.
          </div>

          {partitions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-lg font-medium mb-2">No partitions defined</div>
              <div className="text-sm">
                Click "Add Partition" to create your first token class or tranche
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {partitions.map((partition, index) => (
                <Card key={index} className="border-l-4 border-l-blue-500">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <h4 className="text-sm font-medium">
                      Partition {index + 1}
                      {partition.name && (
                        <span className="text-muted-foreground ml-2">({partition.name})</span>
                      )}
                    </h4>
                    {partitions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePartition(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Basic Partition Info */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`partition-name-${index}`} className="flex items-center">
                          Partition Name *
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Human-readable name for this partition</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id={`partition-name-${index}`}
                          placeholder="e.g., Class A Shares"
                          value={partition.name}
                          onChange={(e) => updatePartition(index, "name", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`partition-id-${index}`} className="flex items-center">
                          Partition ID *
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Unique identifier for the partition (max 32 bytes)</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id={`partition-id-${index}`}
                          placeholder="CLASSA"
                          value={partition.partitionId}
                          onChange={(e) => updatePartition(index, "partitionId", e.target.value)}
                          maxLength={32}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`partition-amount-${index}`} className="flex items-center">
                          Token Amount *
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Number of tokens allocated to this partition</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Input
                          id={`partition-amount-${index}`}
                          placeholder="1000000"
                          value={partition.amount}
                          onChange={(e) => updatePartition(index, "amount", e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`partition-type-${index}`} className="flex items-center">
                          Partition Type
                          <Tooltip>
                            <TooltipTrigger className="ml-1.5">
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Type/class of this partition</p>
                            </TooltipContent>
                          </Tooltip>
                        </Label>
                        <Select
                          value={partition.partitionType}
                          onValueChange={(value) => updatePartition(index, "partitionType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="common">Common Shares</SelectItem>
                            <SelectItem value="preferred">Preferred Shares</SelectItem>
                            <SelectItem value="equity">Equity</SelectItem>
                            <SelectItem value="debt">Debt</SelectItem>
                            <SelectItem value="convertible">Convertible</SelectItem>
                            <SelectItem value="warrant">Warrant</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Partition Features */}
                    <div className="space-y-3 pt-2">
                      <h5 className="text-sm font-medium text-muted-foreground">Partition Features</h5>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Transferable</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Allow transfers within this partition</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={partition.transferable}
                          onCheckedChange={(checked) => updatePartition(index, "transferable", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Corporate Actions</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Enable corporate actions for this partition</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={partition.corporateActions}
                          onCheckedChange={(checked) => updatePartition(index, "corporateActions", checked)}
                        />
                      </div>
                    </div>

                    {/* Partition Metadata */}
                    <div className="space-y-3 pt-2 border-t">
                      <h5 className="text-sm font-medium text-muted-foreground">Additional Properties</h5>
                      
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`partition-voting-${index}`} className="flex items-center">
                            Voting Rights
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Voting rights ratio (1 = full voting rights)</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id={`partition-voting-${index}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="1.0"
                            value={partition.metadata?.votingRights || ""}
                            onChange={(e) => updatePartition(index, "metadata", {
                              ...partition.metadata,
                              votingRights: e.target.value
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`partition-dividend-${index}`} className="flex items-center">
                            Dividend Rights
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Dividend distribution ratio</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id={`partition-dividend-${index}`}
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="1.0"
                            value={partition.metadata?.dividendRights || ""}
                            onChange={(e) => updatePartition(index, "metadata", {
                              ...partition.metadata,
                              dividendRights: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor={`partition-liquidation-${index}`} className="flex items-center">
                            Liquidation Preference
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Liquidation preference order (1 = highest priority)</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id={`partition-liquidation-${index}`}
                            type="number"
                            min="1"
                            placeholder="1"
                            value={partition.metadata?.liquidationPreference || ""}
                            onChange={(e) => updatePartition(index, "metadata", {
                              ...partition.metadata,
                              liquidationPreference: e.target.value
                            })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`partition-conversion-${index}`} className="flex items-center">
                            Conversion Ratio
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Conversion ratio to other partition types</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id={`partition-conversion-${index}`}
                            placeholder="1:1"
                            value={partition.metadata?.conversionRatio || ""}
                            onChange={(e) => updatePartition(index, "metadata", {
                              ...partition.metadata,
                              conversionRatio: e.target.value
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Global Partition Settings */}
          {partitions.length > 1 && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Global Partition Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Cross-Partition Transfers</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Allow conversions between different partitions</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={config.trancheTransferability || false}
                    onCheckedChange={(checked) => {
                      // This would be handled by the parent component
                      console.log("Cross-partition transfers:", checked);
                    }}
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  Total Partitions: {partitions.length} | 
                  Total Allocated: {partitions.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString()} tokens
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400PartitionsForm;
