import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Shield, Users, Key } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface PartitionOperator {
  id?: string;
  partitionId: string;
  holderAddress: string;
  operatorAddress: string;
  authorized: boolean;
  lastUpdated?: string;
  metadata?: any;
}

interface ERC1400PartitionOperatorsFormProps {
  config: any;
  partitions: any[];
  partitionOperators: PartitionOperator[];
  onPartitionOperatorsChange: (operators: PartitionOperator[]) => void;
}

/**
 * ERC-1400 Partition Operators Form Component
 * Manages operator authorizations for specific partitions and holders from token_erc1400_partition_operators table
 */
export const ERC1400PartitionOperatorsForm: React.FC<ERC1400PartitionOperatorsFormProps> = ({
  config,
  partitions,
  partitionOperators,
  onPartitionOperatorsChange,
}) => {
  const [selectedOperator, setSelectedOperator] = useState<number | null>(null);

  // Add a new partition operator
  const addPartitionOperator = () => {
    const newOperator: PartitionOperator = {
      partitionId: partitions.length > 0 ? partitions[0].id || partitions[0].partitionId : "",
      holderAddress: "",
      operatorAddress: "",
      authorized: true,
      metadata: {}
    };
    onPartitionOperatorsChange([...partitionOperators, newOperator]);
    setSelectedOperator(partitionOperators.length);
  };

  // Remove a partition operator
  const removePartitionOperator = (index: number) => {
    const updatedOperators = partitionOperators.filter((_, i) => i !== index);
    onPartitionOperatorsChange(updatedOperators);
    if (selectedOperator === index) {
      setSelectedOperator(null);
    }
  };

  // Update a partition operator
  const updatePartitionOperator = (index: number, field: keyof PartitionOperator, value: any) => {
    const updatedOperators = partitionOperators.map((operator, i) => 
      i === index ? { ...operator, [field]: value } : operator
    );
    onPartitionOperatorsChange(updatedOperators);
  };

  // Get partition name by ID
  const getPartitionName = (partitionId: string) => {
    const partition = partitions.find(p => (p.id || p.partitionId) === partitionId);
    return partition ? partition.name : partitionId;
  };

  // Get authorization status color
  const getAuthStatusColor = (authorized: boolean) => {
    return authorized ? "green" : "red";
  };

  // Validate Ethereum address format
  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            Partition Operators
            <Badge variant="outline" className="ml-2">
              {partitionOperators.length} authorization{partitionOperators.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button onClick={addPartitionOperator} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Authorization
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Manage operator authorizations for specific partitions and token holders.
            Operators can perform actions on behalf of token holders within authorized partitions.
          </div>

          {partitions.length === 0 && (
            <div className="text-center py-4 text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-60" />
              <div className="text-sm font-medium">No partitions available</div>
              <div className="text-xs">Create partitions first before adding operator authorizations</div>
            </div>
          )}

          {partitionOperators.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No operator authorizations configured</div>
              <div className="text-sm">
                Click "Add Authorization" to grant operator permissions
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Operators List */}
              <div className="lg:col-span-1 space-y-3">
                <h4 className="text-sm font-medium">Authorizations</h4>
                <div className="space-y-2">
                  {partitionOperators.map((operator, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors ${
                        selectedOperator === index ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedOperator(index)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <Badge 
                              variant={getAuthStatusColor(operator.authorized) as any}
                              className="text-xs"
                            >
                              {operator.authorized ? 'Authorized' : 'Revoked'}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePartitionOperator(index);
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium mb-1">
                          {getPartitionName(operator.partitionId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Operator: {operator.operatorAddress ? 
                            `${operator.operatorAddress.slice(0, 6)}...${operator.operatorAddress.slice(-4)}` : 
                            'Not set'
                          }
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Holder: {operator.holderAddress ? 
                            `${operator.holderAddress.slice(0, 6)}...${operator.holderAddress.slice(-4)}` : 
                            'Not set'
                          }
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Operator Details */}
              <div className="lg:col-span-2">
                {selectedOperator !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Authorization Details
                        <Shield className="h-5 w-5 ml-2" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="partitionId" className="flex items-center">
                            Partition *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Select the partition for this operator authorization</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={partitionOperators[selectedOperator].partitionId}
                            onValueChange={(value) => updatePartitionOperator(selectedOperator, "partitionId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select partition" />
                            </SelectTrigger>
                            <SelectContent>
                              {partitions.map((partition) => (
                                <SelectItem 
                                  key={partition.id || partition.partitionId} 
                                  value={partition.id || partition.partitionId}
                                >
                                  {partition.name} ({partition.partitionId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="holderAddress" className="flex items-center">
                            Token Holder Address *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Ethereum address of the token holder</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="holderAddress"
                            placeholder="0x..."
                            value={partitionOperators[selectedOperator].holderAddress}
                            onChange={(e) => updatePartitionOperator(selectedOperator, "holderAddress", e.target.value)}
                            className={!isValidAddress(partitionOperators[selectedOperator].holderAddress) && 
                                     partitionOperators[selectedOperator].holderAddress ? "border-red-300" : ""}
                            required
                          />
                          {!isValidAddress(partitionOperators[selectedOperator].holderAddress) && 
                           partitionOperators[selectedOperator].holderAddress && (
                            <div className="text-xs text-red-600">Invalid Ethereum address format</div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="operatorAddress" className="flex items-center">
                            Operator Address *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Ethereum address of the authorized operator</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="operatorAddress"
                            placeholder="0x..."
                            value={partitionOperators[selectedOperator].operatorAddress}
                            onChange={(e) => updatePartitionOperator(selectedOperator, "operatorAddress", e.target.value)}
                            className={!isValidAddress(partitionOperators[selectedOperator].operatorAddress) && 
                                     partitionOperators[selectedOperator].operatorAddress ? "border-red-300" : ""}
                            required
                          />
                          {!isValidAddress(partitionOperators[selectedOperator].operatorAddress) && 
                           partitionOperators[selectedOperator].operatorAddress && (
                            <div className="text-xs text-red-600">Invalid Ethereum address format</div>
                          )}
                        </div>
                      </div>

                      {/* Authorization Status */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Authorization Status</h5>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Authorized</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Whether this operator is currently authorized to act on behalf of the holder</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={partitionOperators[selectedOperator].authorized}
                            onCheckedChange={(checked) => updatePartitionOperator(selectedOperator, "authorized", checked)}
                          />
                        </div>
                      </div>

                      {/* Additional Metadata */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Additional Information</h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="authorizationPurpose">Authorization Purpose</Label>
                            <Input
                              id="authorizationPurpose"
                              placeholder="e.g., Trading, Custody, Management"
                              value={partitionOperators[selectedOperator].metadata?.purpose || ""}
                              onChange={(e) => updatePartitionOperator(selectedOperator, "metadata", {
                                ...partitionOperators[selectedOperator].metadata,
                                purpose: e.target.value
                              })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="expirationDate">Expiration Date</Label>
                            <Input
                              id="expirationDate"
                              type="date"
                              value={partitionOperators[selectedOperator].metadata?.expirationDate || ""}
                              onChange={(e) => updatePartitionOperator(selectedOperator, "metadata", {
                                ...partitionOperators[selectedOperator].metadata,
                                expirationDate: e.target.value
                              })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Input
                            id="notes"
                            placeholder="Additional notes about this authorization"
                            value={partitionOperators[selectedOperator].metadata?.notes || ""}
                            onChange={(e) => updatePartitionOperator(selectedOperator, "metadata", {
                              ...partitionOperators[selectedOperator].metadata,
                              notes: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      {/* Validation Warnings */}
                      {partitionOperators[selectedOperator].holderAddress === partitionOperators[selectedOperator].operatorAddress && 
                       partitionOperators[selectedOperator].holderAddress && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center space-x-2 text-amber-800">
                            <Shield className="h-4 w-4" />
                            <span className="text-sm font-medium">Warning: Self-Authorization</span>
                          </div>
                          <div className="text-xs text-amber-700 mt-1">
                            The holder and operator addresses are the same. This creates a self-authorization.
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {partitionOperators.length > 0 && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Authorization Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Total Authorizations: {partitionOperators.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Active: {partitionOperators.filter(op => op.authorized).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Revoked: {partitionOperators.filter(op => !op.authorized).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Unique Operators: {[...new Set(partitionOperators.map(op => op.operatorAddress))].filter(addr => addr).length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Unique Holders: {[...new Set(partitionOperators.map(op => op.holderAddress))].filter(addr => addr).length}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400PartitionOperatorsForm;
