import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Shield, Building2, CheckCircle } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface CustodyProvider {
  id?: string;
  providerName: string;
  providerType: string;
  providerAddress?: string;
  providerLei?: string;
  custodyAgreementHash?: string;
  isActive: boolean;
  certificationLevel?: string;
  jurisdiction?: string;
  regulatoryApprovals: string[];
  integrationStatus: string;
}

interface ERC1400CustodyProvidersFormProps {
  config: any;
  custodyProviders: CustodyProvider[];
  onCustodyProvidersChange: (providers: CustodyProvider[]) => void;
}

/**
 * ERC-1400 Custody Providers Form Component
 * Manages custody provider configurations from token_erc1400_custody_providers table
 */
export const ERC1400CustodyProvidersForm: React.FC<ERC1400CustodyProvidersFormProps> = ({
  config,
  custodyProviders,
  onCustodyProvidersChange,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);

  // Add a new custody provider
  const addCustodyProvider = () => {
    const newProvider: CustodyProvider = {
      providerName: "",
      providerType: "bank",
      isActive: true,
      regulatoryApprovals: [],
      integrationStatus: "pending"
    };
    onCustodyProvidersChange([...custodyProviders, newProvider]);
    setSelectedProvider(custodyProviders.length);
  };

  // Remove a custody provider
  const removeCustodyProvider = (index: number) => {
    const updatedProviders = custodyProviders.filter((_, i) => i !== index);
    onCustodyProvidersChange(updatedProviders);
    if (selectedProvider === index) {
      setSelectedProvider(null);
    }
  };

  // Update a custody provider
  const updateCustodyProvider = (index: number, field: keyof CustodyProvider, value: any) => {
    const updatedProviders = custodyProviders.map((provider, i) => 
      i === index ? { ...provider, [field]: value } : provider
    );
    onCustodyProvidersChange(updatedProviders);
  };

  // Toggle regulatory approval
  const toggleRegulatoryApproval = (index: number, approval: string) => {
    const provider = custodyProviders[index];
    const approvals = provider.regulatoryApprovals || [];
    const updatedApprovals = approvals.includes(approval)
      ? approvals.filter(a => a !== approval)
      : [...approvals, approval];
    updateCustodyProvider(index, "regulatoryApprovals", updatedApprovals);
  };

  const getProviderTypeIcon = (providerType: string) => {
    switch (providerType) {
      case "bank": return "🏦";
      case "trust_company": return "🏛️";
      case "custody_bank": return "🔒";
      case "digital_custodian": return "💻";
      case "qualified_custodian": return "✅";
      default: return "🏢";
    }
  };

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case "integrated": return "green";
      case "testing": return "yellow";
      case "pending": return "blue";
      case "failed": return "red";
      default: return "gray";
    }
  };

  const getCertificationColor = (level: string) => {
    switch (level) {
      case "tier_1": return "green";
      case "tier_2": return "blue";
      case "tier_3": return "orange";
      default: return "gray";
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Custody Providers
            <Badge variant="outline" className="ml-2">
              {custodyProviders.length} provider{custodyProviders.length !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
          <Button onClick={addCustodyProvider} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground mb-4">
            Manage institutional custody providers for secure token storage and settlement.
            Configure integration settings, regulatory approvals, and certification levels.
          </div>

          {custodyProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg font-medium mb-2">No custody providers configured</div>
              <div className="text-sm">
                Click "Add Provider" to configure your first custody provider
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Providers List */}
              <div className="lg:col-span-1 space-y-3">
                <h4 className="text-sm font-medium">Providers</h4>
                <div className="space-y-2">
                  {custodyProviders.map((provider, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors ${
                        selectedProvider === index ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedProvider(index)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{getProviderTypeIcon(provider.providerType)}</span>
                            <div className="flex space-x-1">
                              {provider.isActive && (
                                <Badge variant="default" className="text-xs">Active</Badge>
                              )}
                              <Badge 
                                variant={getIntegrationStatusColor(provider.integrationStatus) as any}
                                className="text-xs"
                              >
                                {provider.integrationStatus}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeCustodyProvider(index);
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-medium">
                          {provider.providerName || 'Unnamed Provider'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {provider.providerType.replace('_', ' ').toUpperCase()}
                        </div>
                        {provider.certificationLevel && (
                          <Badge 
                            variant={getCertificationColor(provider.certificationLevel) as any}
                            className="text-xs mt-1"
                          >
                            {provider.certificationLevel.replace('_', ' ').toUpperCase()}
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Provider Details */}
              <div className="lg:col-span-2">
                {selectedProvider !== null && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        Provider Details
                        <span className="ml-2 text-lg">
                          {getProviderTypeIcon(custodyProviders[selectedProvider].providerType)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="providerName" className="flex items-center">
                            Provider Name *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Legal name of the custody provider</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="providerName"
                            placeholder="e.g., Goldman Sachs Custody"
                            value={custodyProviders[selectedProvider].providerName}
                            onChange={(e) => updateCustodyProvider(selectedProvider, "providerName", e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="providerType" className="flex items-center">
                            Provider Type *
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Type of custody provider</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Select
                            value={custodyProviders[selectedProvider].providerType}
                            onValueChange={(value) => updateCustodyProvider(selectedProvider, "providerType", value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bank">Commercial Bank</SelectItem>
                              <SelectItem value="custody_bank">Custody Bank</SelectItem>
                              <SelectItem value="trust_company">Trust Company</SelectItem>
                              <SelectItem value="investment_bank">Investment Bank</SelectItem>
                              <SelectItem value="digital_custodian">Digital Asset Custodian</SelectItem>
                              <SelectItem value="qualified_custodian">Qualified Custodian</SelectItem>
                              <SelectItem value="prime_brokerage">Prime Brokerage</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="jurisdiction">Jurisdiction</Label>
                          <Input
                            id="jurisdiction"
                            placeholder="e.g., United States"
                            value={custodyProviders[selectedProvider].jurisdiction || ""}
                            onChange={(e) => updateCustodyProvider(selectedProvider, "jurisdiction", e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="providerLei">LEI Code</Label>
                          <Input
                            id="providerLei"
                            placeholder="20-character LEI"
                            maxLength={20}
                            value={custodyProviders[selectedProvider].providerLei || ""}
                            onChange={(e) => updateCustodyProvider(selectedProvider, "providerLei", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="providerAddress">Provider Address</Label>
                        <Textarea
                          id="providerAddress"
                          placeholder="Full business address of the custody provider"
                          value={custodyProviders[selectedProvider].providerAddress || ""}
                          onChange={(e) => updateCustodyProvider(selectedProvider, "providerAddress", e.target.value)}
                          rows={2}
                        />
                      </div>

                      {/* Status and Certification */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Status & Certification
                        </h5>
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">Active</span>
                              <Tooltip>
                                <TooltipTrigger>
                                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">Is this provider currently active?</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Switch
                              checked={custodyProviders[selectedProvider].isActive}
                              onCheckedChange={(checked) => updateCustodyProvider(selectedProvider, "isActive", checked)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="certificationLevel">Certification Level</Label>
                            <Select
                              value={custodyProviders[selectedProvider].certificationLevel || ""}
                              onValueChange={(value) => updateCustodyProvider(selectedProvider, "certificationLevel", value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="tier_1">Tier 1 (Highest)</SelectItem>
                                <SelectItem value="tier_2">Tier 2 (Standard)</SelectItem>
                                <SelectItem value="tier_3">Tier 3 (Basic)</SelectItem>
                                <SelectItem value="unrated">Unrated</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="integrationStatus">Integration Status</Label>
                            <Select
                              value={custodyProviders[selectedProvider].integrationStatus}
                              onValueChange={(value) => updateCustodyProvider(selectedProvider, "integrationStatus", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="testing">Testing</SelectItem>
                                <SelectItem value="integrated">Integrated</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="disabled">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Regulatory Approvals */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Regulatory Approvals</h5>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {[
                            { key: "sec", label: "SEC Registered" },
                            { key: "finra", label: "FINRA Member" },
                            { key: "fdic", label: "FDIC Insured" },
                            { key: "occ", label: "OCC Regulated" },
                            { key: "cftc", label: "CFTC Registered" },
                            { key: "sipc", label: "SIPC Protected" },
                            { key: "fca", label: "FCA Authorized" },
                            { key: "other", label: "Other Approvals" }
                          ].map((approval) => (
                            <div key={approval.key} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`approval-${approval.key}`}
                                checked={(custodyProviders[selectedProvider].regulatoryApprovals || []).includes(approval.key)}
                                onChange={() => toggleRegulatoryApproval(selectedProvider, approval.key)}
                                className="rounded border-gray-300"
                              />
                              <Label htmlFor={`approval-${approval.key}`} className="text-sm">
                                {approval.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Agreement Details */}
                      <div className="space-y-4">
                        <h5 className="text-sm font-medium text-muted-foreground">Agreement Details</h5>
                        
                        <div className="space-y-2">
                          <Label htmlFor="custodyAgreementHash" className="flex items-center">
                            Custody Agreement Hash
                            <Tooltip>
                              <TooltipTrigger className="ml-1.5">
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Hash of the signed custody agreement document</p>
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <Input
                            id="custodyAgreementHash"
                            placeholder="0x..."
                            value={custodyProviders[selectedProvider].custodyAgreementHash || ""}
                            onChange={(e) => updateCustodyProvider(selectedProvider, "custodyAgreementHash", e.target.value)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Summary */}
          {custodyProviders.length > 0 && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-sm">Custody Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  Active Providers: {custodyProviders.filter(p => p.isActive).length} / {custodyProviders.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Integrated: {custodyProviders.filter(p => p.integrationStatus === 'integrated').length}
                </div>
                <div className="text-xs text-muted-foreground">
                  Provider Types: {[...new Set(custodyProviders.map(p => p.providerType))].join(', ')}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1400CustodyProvidersForm;
