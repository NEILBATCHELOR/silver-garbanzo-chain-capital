import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2 } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DiscountTier {
  id: string;
  min_quantity: number;
  max_quantity?: number;
  discount_percentage: string;
  tier_name?: string;
  is_active: boolean;
}

interface ERC1155PricingFormProps {
  config: any;
  discountTiers: DiscountTier[];
  onChange: (field: string, value: any) => void;
  onDiscountTiersChange: (tiers: DiscountTier[]) => void;
}

/**
 * ERC-1155 Pricing & Economics Form Component
 * Handles pricing models, discount tiers, and marketplace features
 * Covers token_erc1155_discount_tiers table and pricing-related fields
 */
const ERC1155PricingForm: React.FC<ERC1155PricingFormProps> = ({ 
  config, 
  discountTiers = [], 
  onChange, 
  onDiscountTiersChange 
}) => {
  const [newTier, setNewTier] = useState<DiscountTier>({
    id: "",
    min_quantity: 1,
    max_quantity: undefined,
    discount_percentage: "0",
    tier_name: "",
    is_active: true
  });

  // Add new discount tier
  const addDiscountTier = () => {
    const tier: DiscountTier = {
      ...newTier,
      id: crypto.randomUUID()
    };
    onDiscountTiersChange([...discountTiers, tier]);
    
    // Reset form
    setNewTier({
      id: "",
      min_quantity: 1,
      max_quantity: undefined,
      discount_percentage: "0",
      tier_name: "",
      is_active: true
    });
  };

  // Remove discount tier
  const removeDiscountTier = (index: number) => {
    const updatedTiers = discountTiers.filter((_, i) => i !== index);
    onDiscountTiersChange(updatedTiers);
  };

  // Update discount tier
  const updateDiscountTier = (index: number, field: string, value: any) => {
    const updatedTiers = [...discountTiers];
    updatedTiers[index] = { ...updatedTiers[index], [field]: value };
    onDiscountTiersChange(updatedTiers);
  };

  // Update pricing config
  const handlePricingChange = (field: string, value: any) => {
    onChange(field, value);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Base Pricing Model */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Model</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pricing_model" className="flex items-center">
                  Pricing Model
                  <Tooltip>
                    <TooltipTrigger className="ml-1.5">
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">How tokens are priced for minting and trading</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select 
                  value={config.pricing_model || "fixed"} 
                  onValueChange={(value) => handlePricingChange("pricing_model", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pricing model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Price</SelectItem>
                    <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                    <SelectItem value="auction">Auction-Based</SelectItem>
                    <SelectItem value="bonding_curve">Bonding Curve</SelectItem>
                    <SelectItem value="free">Free Mint</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.pricing_model !== "free" && (
                <div className="space-y-2">
                  <Label htmlFor="base_price" className="flex items-center">
                    Base Price (ETH)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Base price for minting tokens</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    step="0.000001"
                    value={config.base_price || ""}
                    onChange={(e) => handlePricingChange("base_price", e.target.value)}
                    placeholder="0.01"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bulk Discounts */}
        <Card>
          <CardHeader>
            <CardTitle>Bulk Discount Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Enable Bulk Discounts</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Offer discounts for bulk purchases</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.bulk_discount_enabled || false}
                  onCheckedChange={(checked) => handlePricingChange("bulk_discount_enabled", checked)}
                />
              </div>

              {config.bulk_discount_enabled && (
                <div className="space-y-4">
                  {/* Add New Tier */}
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-medium mb-3">Add Discount Tier</h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="tier_name">Tier Name</Label>
                        <Input
                          id="tier_name"
                          value={newTier.tier_name}
                          onChange={(e) => setNewTier(prev => ({ ...prev, tier_name: e.target.value }))}
                          placeholder="Bronze"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="min_quantity">Min Quantity</Label>
                        <Input
                          id="min_quantity"
                          type="number"
                          min="1"
                          value={newTier.min_quantity}
                          onChange={(e) => setNewTier(prev => ({ ...prev, min_quantity: parseInt(e.target.value) || 1 }))}
                          placeholder="10"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max_quantity">Max Quantity (Optional)</Label>
                        <Input
                          id="max_quantity"
                          type="number"
                          min="1"
                          value={newTier.max_quantity || ""}
                          onChange={(e) => setNewTier(prev => ({ ...prev, max_quantity: parseInt(e.target.value) || undefined }))}
                          placeholder="99"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discount_percentage">Discount %</Label>
                        <Input
                          id="discount_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={newTier.discount_percentage}
                          onChange={(e) => setNewTier(prev => ({ ...prev, discount_percentage: e.target.value }))}
                          placeholder="10"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end mt-3">
                      <Button onClick={addDiscountTier} size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Tier
                      </Button>
                    </div>
                  </div>

                  {/* Existing Tiers */}
                  {discountTiers.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Configured Discount Tiers</h4>
                      {discountTiers.map((tier, index) => (
                        <div key={tier.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 flex-1">
                              <div>
                                <span className="text-xs text-muted-foreground">Tier Name</span>
                                <Input
                                  value={tier.tier_name || ""}
                                  onChange={(e) => updateDiscountTier(index, "tier_name", e.target.value)}
                                  placeholder="Tier name"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Min Qty</span>
                                <Input
                                  type="number"
                                  value={tier.min_quantity}
                                  onChange={(e) => updateDiscountTier(index, "min_quantity", parseInt(e.target.value) || 1)}
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Max Qty</span>
                                <Input
                                  type="number"
                                  value={tier.max_quantity || ""}
                                  onChange={(e) => updateDiscountTier(index, "max_quantity", parseInt(e.target.value) || undefined)}
                                  placeholder="No limit"
                                  className="h-8"
                                />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Discount %</span>
                                <Input
                                  type="number"
                                  value={tier.discount_percentage}
                                  onChange={(e) => updateDiscountTier(index, "discount_percentage", e.target.value)}
                                  className="h-8"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <Switch
                                checked={tier.is_active}
                                onCheckedChange={(checked) => updateDiscountTier(index, "is_active", checked)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDiscountTier(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Economics */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Economics</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["referrals"]}>
              {/* Referral System */}
              <AccordionItem value="referrals">
                <AccordionTrigger>Referral & Rewards System</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Referral Rewards</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Reward users for referring new buyers</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.referral_rewards_enabled || false}
                        onCheckedChange={(checked) => handlePricingChange("referral_rewards_enabled", checked)}
                      />
                    </div>

                    {config.referral_rewards_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="referral_percentage">Referral Percentage (%)</Label>
                        <Input
                          id="referral_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={config.referral_percentage || ""}
                          onChange={(e) => handlePricingChange("referral_percentage", e.target.value)}
                          placeholder="5.0"
                        />
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Lazy Minting */}
              <AccordionItem value="lazy-minting">
                <AccordionTrigger>Lazy Minting & Claims</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Lazy Minting</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Mint tokens only when they are first transferred or sold</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.lazy_minting_enabled || false}
                        onCheckedChange={(checked) => handlePricingChange("lazy_minting_enabled", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Airdrop Support</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Enable airdrop functionality for distributing tokens</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.airdrop_enabled || false}
                        onCheckedChange={(checked) => handlePricingChange("airdrop_enabled", checked)}
                      />
                    </div>

                    {config.airdrop_enabled && (
                      <div className="space-y-2">
                        <Label htmlFor="airdrop_snapshot_block">Snapshot Block (Optional)</Label>
                        <Input
                          id="airdrop_snapshot_block"
                          type="number"
                          value={config.airdrop_snapshot_block || ""}
                          onChange={(e) => handlePricingChange("airdrop_snapshot_block", parseInt(e.target.value) || null)}
                          placeholder="Block number for snapshot"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Claim Period</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Enable time-limited claiming periods</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.claim_period_enabled || false}
                        onCheckedChange={(checked) => handlePricingChange("claim_period_enabled", checked)}
                      />
                    </div>

                    {config.claim_period_enabled && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="claim_start_time">Claim Start Time</Label>
                          <Input
                            id="claim_start_time"
                            type="datetime-local"
                            value={config.claim_start_time ? new Date(config.claim_start_time).toISOString().slice(0, 16) : ""}
                            onChange={(e) => handlePricingChange("claim_start_time", e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="claim_end_time">Claim End Time</Label>
                          <Input
                            id="claim_end_time"
                            type="datetime-local"
                            value={config.claim_end_time ? new Date(config.claim_end_time).toISOString().slice(0, 16) : ""}
                            onChange={(e) => handlePricingChange("claim_end_time", e.target.value ? new Date(e.target.value).toISOString() : null)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Marketplace Features */}
              <AccordionItem value="marketplace">
                <AccordionTrigger>Marketplace Integration</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Marketplace Fees</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Enable marketplace transaction fees</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.marketplace_fees_enabled || false}
                        onCheckedChange={(checked) => handlePricingChange("marketplace_fees_enabled", checked)}
                      />
                    </div>

                    {config.marketplace_fees_enabled && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="marketplace_fee_percentage">Fee Percentage (%)</Label>
                          <Input
                            id="marketplace_fee_percentage"
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={config.marketplace_fee_percentage || ""}
                            onChange={(e) => handlePricingChange("marketplace_fee_percentage", e.target.value)}
                            placeholder="2.5"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="marketplace_fee_recipient">Fee Recipient Address</Label>
                          <Input
                            id="marketplace_fee_recipient"
                            value={config.marketplace_fee_recipient || ""}
                            onChange={(e) => handlePricingChange("marketplace_fee_recipient", e.target.value)}
                            placeholder="0x..."
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Bundle Trading</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Allow trading tokens as bundles</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={config.bundle_trading_enabled || false}
                          onCheckedChange={(checked) => handlePricingChange("bundle_trading_enabled", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Atomic Swaps</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Enable atomic swap functionality</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={config.atomic_swaps_enabled || false}
                          onCheckedChange={(checked) => handlePricingChange("atomic_swaps_enabled", checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">Cross-Collection Trading</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Allow trading with tokens from other collections</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Switch
                          checked={config.cross_collection_trading || false}
                          onCheckedChange={(checked) => handlePricingChange("cross_collection_trading", checked)}
                        />
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default ERC1155PricingForm;