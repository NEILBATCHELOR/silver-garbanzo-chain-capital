import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Calendar, FileText, AlertCircle } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface CorporateAction {
  id?: string;
  actionType: string;
  announcementDate: string;
  recordDate?: string;
  effectiveDate?: string;
  paymentDate?: string;
  actionDetails: any;
  impactOnSupply?: string;
  impactOnPrice?: string;
  shareholderApprovalRequired?: boolean;
  votingDeadline?: string;
  regulatoryApprovalRequired?: boolean;
  status: string;
  executionTransactionHash?: string;
}

interface ERC1400CorporateActionsManagementFormProps {
  config: any;
  corporateActions: CorporateAction[];
  onCorporateActionsChange: (actions: CorporateAction[]) => void;
}

/**
 * ERC-1400 Corporate Actions Management Form Component
 * Manages individual corporate action records from token_erc1400_corporate_actions table
 */
export const ERC1400CorporateActionsManagementForm: React.FC<ERC1400CorporateActionsManagementFormProps> = ({
  config,
  corporateActions,
  onCorporateActionsChange,
}) => {
  const [selectedAction, setSelectedAction] = useState<number | null>(null);

  // Add a new corporate action
  const addCorporateAction = () => {
    const newAction: CorporateAction = {
      actionType: "",
      announcementDate: new Date().toISOString().split('T')[0],
      actionDetails: {},
      status: "announced",
      shareholderApprovalRequired: false,
      regulatoryApprovalRequired: false
    };
    onCorporateActionsChange([...corporateActions, newAction]);
    setSelectedAction(corporateActions.length);
  };

  // Remove a corporate action
  const removeCorporateAction = (index: number) => {
    const updatedActions = corporateActions.filter((_, i) => i !== index);
    onCorporateActionsChange(updatedActions);
    if (selectedAction === index) {
      setSelectedAction(null);
    }
  };

  // Update a corporate action
  const updateCorporateAction = (index: number, field: keyof CorporateAction, value: any) => {
    const updatedActions = corporateActions.map((action, i) => 
      i === index ? { ...action, [field]: value } : action
    );
    onCorporateActionsChange(updatedActions);
  };

  // Update action details (JSONB field)
  const updateActionDetails = (index: number, key: string, value: any) => {
    const action = corporateActions[index];
    const updatedDetails = { ...action.actionDetails, [key]: value };
    updateCorporateAction(index, "actionDetails", updatedDetails);
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "dividend": return "💰";
      case "stock_split": return "📈";
      case "merger": return "🤝";
      case "spin_off": return "🔄";
      case "rights_offering": return "🎫";
      case "buyback": return "🔙";
      default: return "📋";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "announced": return "blue";
      case "approved": return "green";
      case "executed": return "purple";
      case "cancelled": return "red";
      default: return "gray";
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            Corporate Actions Management
            <Badge variant="outline" className="ml-2">
              {corporateActions.length} action{corporateActions.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button onClick={addCorporateAction} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            New Action
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Manage corporate actions such as dividends, stock splits, mergers, and other corporate events.
            Each action tracks important dates, approvals, and execution details.
          </div>

          {corporateActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No corporate actions defined</div>
              <div className="text-sm">
                Click "New Action" to create your first corporate action
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Actions List */}
              <div className="lg:col-span-1 space-y-3">
                <h4 className="text-sm font-medium">Actions</h4>
                <div className="space-y-2">
                  {corporateActions.map((action, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors ${
                        selectedAction === index ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedAction(index)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getActionTypeIcon(action.actionType)}</span>
                            <Badge variant={getStatusColor(action.status) as any}>
                              {action.status}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCorporateAction(index);
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium">
                          {action.actionType.replace('_', ' ').toUpperCase() || 'Unnamed Action'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {action.announcementDate}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Action Details */}
              <div className="lg:col-span-2">
                {selectedAction !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Action Details
                        <span className="ml-2 text-lg">
                          {getActionTypeIcon(corporateActions[selectedAction].actionType)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="actionType" className="flex items-center">
                            Action Type *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Type of corporate action</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={corporateActions[selectedAction].actionType}
                            onValueChange={(value) => updateCorporateAction(selectedAction, "actionType", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select action type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="dividend">Dividend Payment</SelectItem>
                              <SelectItem value="stock_split">Stock Split</SelectItem>
                              <SelectItem value="stock_dividend">Stock Dividend</SelectItem>
                              <SelectItem value="rights_offering">Rights Offering</SelectItem>
                              <SelectItem value="spin_off">Spin-off</SelectItem>
                              <SelectItem value="merger">Merger</SelectItem>
                              <SelectItem value="acquisition">Acquisition</SelectItem>
                              <SelectItem value="buyback">Share Buyback</SelectItem>
                              <SelectItem value="liquidation">Liquidation</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status" className="flex items-center">
                            Status *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Current status of the corporate action</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={corporateActions[selectedAction].status}
                            onValueChange={(value) => updateCorporateAction(selectedAction, "status", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="announced">Announced</SelectItem>
                              <SelectItem value="pending_approval">Pending Approval</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="executed">Executed</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Important Dates */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          Important Dates
                        </h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="announcementDate">Announcement Date *</Label>
                            <Input
                              id="announcementDate"
                              type="date"
                              value={corporateActions[selectedAction].announcementDate}
                              onChange={(e) => updateCorporateAction(selectedAction, "announcementDate", e.target.value)}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="recordDate">Record Date</Label>
                            <Input
                              id="recordDate"
                              type="date"
                              value={corporateActions[selectedAction].recordDate || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "recordDate", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="effectiveDate">Effective Date</Label>
                            <Input
                              id="effectiveDate"
                              type="date"
                              value={corporateActions[selectedAction].effectiveDate || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "effectiveDate", e.target.value)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="paymentDate">Payment Date</Label>
                            <Input
                              id="paymentDate"
                              type="date"
                              value={corporateActions[selectedAction].paymentDate || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "paymentDate", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Approval Requirements */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Approval Requirements
                        </h5>
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Shareholder Approval Required</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Does this action require shareholder voting approval?</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={corporateActions[selectedAction].shareholderApprovalRequired || false}
                              onCheckedChange={(checked) => updateCorporateAction(selectedAction, "shareholderApprovalRequired", checked)}
                            />
                          </div>

                          {corporateActions[selectedAction].shareholderApprovalRequired && (
                            <div className="space-y-2">
                              <Label htmlFor="votingDeadline">Voting Deadline</Label>
                              <Input
                                id="votingDeadline"
                                type="date"
                                value={corporateActions[selectedAction].votingDeadline || ""}
                                onChange={(e) => updateCorporateAction(selectedAction, "votingDeadline", e.target.value)}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Regulatory Approval Required</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Does this action require regulatory approval?</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={corporateActions[selectedAction].regulatoryApprovalRequired || false}
                              onCheckedChange={(checked) => updateCorporateAction(selectedAction, "regulatoryApprovalRequired", checked)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Impact Analysis */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Impact Analysis</h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="impactOnSupply">Impact on Supply</Label>
                            <Textarea
                              id="impactOnSupply"
                              placeholder="Describe how this action affects token supply..."
                              value={corporateActions[selectedAction].impactOnSupply || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "impactOnSupply", e.target.value)}
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="impactOnPrice">Impact on Price</Label>
                            <Textarea
                              id="impactOnPrice"
                              placeholder="Describe expected price impact..."
                              value={corporateActions[selectedAction].impactOnPrice || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "impactOnPrice", e.target.value)}
                              rows={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action-Specific Details */}
                      {corporateActions[selectedAction].actionType === "dividend" && (
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Dividend Details</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                              <Label>Dividend Amount per Share</Label>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.25"
                                value={corporateActions[selectedAction].actionDetails?.dividendAmount || ""}
                                onChange={(e) => updateActionDetails(selectedAction, "dividendAmount", e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Currency</Label>
                              <Select
                                value={corporateActions[selectedAction].actionDetails?.currency || "USD"}
                                onValueChange={(value) => updateActionDetails(selectedAction, "currency", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="EUR">EUR</SelectItem>
                                  <SelectItem value="GBP">GBP</SelectItem>
                                  <SelectItem value="ETH">ETH</SelectItem>
                                  <SelectItem value="USDC">USDC</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Dividend Type</Label>
                              <Select
                                value={corporateActions[selectedAction].actionDetails?.dividendType || "cash"}
                                onValueChange={(value) => updateActionDetails(selectedAction, "dividendType", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="stock">Stock</SelectItem>
                                  <SelectItem value="property">Property</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {corporateActions[selectedAction].actionType === "stock_split" && (
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Stock Split Details</h5>
                          
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Split Ratio (e.g., 2:1)</Label>
                              <Input
                                placeholder="2:1"
                                value={corporateActions[selectedAction].actionDetails?.splitRatio || ""}
                                onChange={(e) => updateActionDetails(selectedAction, "splitRatio", e.target.value)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>New Total Supply</Label>
                              <Input
                                type="number"
                                placeholder="2000000"
                                value={corporateActions[selectedAction].actionDetails?.newTotalSupply || ""}
                                onChange={(e) => updateActionDetails(selectedAction, "newTotalSupply", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Execution Details */}
                      {corporateActions[selectedAction].status === "executed" && (
                        <div className="space-y-4">
                          <h5 className="text-sm font-medium text-muted-foreground">Execution Details</h5>
                          
                          <div className="space-y-2">
                            <Label htmlFor="executionTransactionHash">Transaction Hash</Label>
                            <Input
                              id="executionTransactionHash"
                              placeholder="0x..."
                              value={corporateActions[selectedAction].executionTransactionHash || ""}
                              onChange={(e) => updateCorporateAction(selectedAction, "executionTransactionHash", e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400CorporateActionsManagementForm;
