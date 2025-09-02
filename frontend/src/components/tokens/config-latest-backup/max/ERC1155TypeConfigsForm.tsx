import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface TypeConfig {
  id: string;
  token_type_id: string;
  supply_cap?: string;
  mint_price?: string;
  is_tradeable: boolean;
  is_transferable: boolean;
  utility_type?: string;
  rarity_tier?: string;
  experience_value?: number;
  crafting_materials?: any;
  burn_rewards?: any;
  created_at?: string;
  updated_at?: string;
}

interface ERC1155TypeConfigsFormProps {
  typeConfigs: TypeConfig[];
  onChange: (typeConfigs: TypeConfig[]) => void;
}

/**
 * ERC-1155 Type Configurations Form Component
 * Manages token_erc1155_type_configs table data
 * Handles individual token type settings, prices, and utility configurations
 */
const ERC1155TypeConfigsForm: React.FC<ERC1155TypeConfigsFormProps> = ({ 
  typeConfigs = [], 
  onChange 
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentConfig, setCurrentConfig] = useState<TypeConfig>({
    id: "",
    token_type_id: "1",
    supply_cap: "",
    mint_price: "",
    is_tradeable: true,
    is_transferable: true,
    utility_type: "collectible",
    rarity_tier: "common",
    experience_value: 0,
    crafting_materials: {},
    burn_rewards: {}
  });

  // Add new type config
  const addTypeConfig = () => {
    setCurrentConfig({
      id: "",
      token_type_id: "1",
      supply_cap: "",
      mint_price: "",
      is_tradeable: true,
      is_transferable: true,
      utility_type: "collectible",
      rarity_tier: "common",
      experience_value: 0,
      crafting_materials: {},
      burn_rewards: {}
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  // Edit existing type config
  const editTypeConfig = (index: number) => {
    setCurrentConfig({ ...typeConfigs[index] });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Save type config
  const saveTypeConfig = () => {
    const updatedConfigs = [...typeConfigs];
    
    if (editingIndex !== null) {
      updatedConfigs[editingIndex] = currentConfig;
    } else {
      updatedConfigs.push({ ...currentConfig, id: crypto.randomUUID() });
    }
    
    onChange(updatedConfigs);
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  // Remove type config
  const removeTypeConfig = (index: number) => {
    const updatedConfigs = typeConfigs.filter((_, i) => i !== index);
    onChange(updatedConfigs);
  };

  // Update current config
  const updateCurrentConfig = (field: string, value: any) => {
    setCurrentConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update crafting materials
  const updateCraftingMaterials = (value: string) => {
    try {
      const materials = value ? JSON.parse(value) : {};
      updateCurrentConfig("crafting_materials", materials);
    } catch (error) {
      // Invalid JSON, but don't clear the field
    }
  };

  // Update burn rewards
  const updateBurnRewards = (value: string) => {
    try {
      const rewards = value ? JSON.parse(value) : {};
      updateCurrentConfig("burn_rewards", rewards);
    } catch (error) {
      // Invalid JSON, but don't clear the field
    }
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Token Type Configurations</CardTitle>
          <Button onClick={addTypeConfig} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Type Config
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {typeConfigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No token type configurations defined yet.</p>
                <p className="text-sm">Click "Add Type Config" to configure your token types.</p>
              </div>
            ) : (
              typeConfigs.map((config, index) => (
                <div key={config.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Token Type: {config.token_type_id}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          config.rarity_tier === 'legendary' ? 'bg-yellow-100 text-yellow-800' :
                          config.rarity_tier === 'epic' ? 'bg-purple-100 text-purple-800' :
                          config.rarity_tier === 'rare' ? 'bg-blue-100 text-blue-800' :
                          config.rarity_tier === 'uncommon' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {config.rarity_tier || 'common'}
                        </span>
                        <span className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                          {config.utility_type || 'collectible'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          {config.supply_cap && <p>Supply Cap: {config.supply_cap}</p>}
                          {config.mint_price && <p>Mint Price: {config.mint_price} ETH</p>}
                          {config.experience_value > 0 && <p>XP Value: {config.experience_value}</p>}
                        </div>
                        <div>
                          <p>Tradeable: {config.is_tradeable ? 'Yes' : 'No'}</p>
                          <p>Transferable: {config.is_transferable ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editTypeConfig(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTypeConfig(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Type Config Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? 'Edit Token Type Configuration' : 'Add Token Type Configuration'}
                </DialogTitle>
                <DialogDescription>
                  Configure the specific properties, utility, and economics for this token type.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Basic Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Basic Configuration</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="token_type_id" className="flex items-center">
                        Token Type ID *
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">The ID of the token type this configuration applies to</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="token_type_id"
                        value={currentConfig.token_type_id}
                        onChange={(e) => updateCurrentConfig("token_type_id", e.target.value)}
                        placeholder="1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rarity_tier" className="flex items-center">
                        Rarity Tier
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">The rarity classification of this token type</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select 
                        value={currentConfig.rarity_tier || "common"} 
                        onValueChange={(value) => updateCurrentConfig("rarity_tier", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select rarity tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="common">Common</SelectItem>
                          <SelectItem value="uncommon">Uncommon</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="epic">Epic</SelectItem>
                          <SelectItem value="legendary">Legendary</SelectItem>
                          <SelectItem value="mythic">Mythic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="utility_type" className="flex items-center">
                        Utility Type
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">The primary utility or purpose of this token type</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Select 
                        value={currentConfig.utility_type || "collectible"} 
                        onValueChange={(value) => updateCurrentConfig("utility_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select utility type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="collectible">Collectible</SelectItem>
                          <SelectItem value="consumable">Consumable</SelectItem>
                          <SelectItem value="equipment">Equipment</SelectItem>
                          <SelectItem value="resource">Resource</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="access_token">Access Token</SelectItem>
                          <SelectItem value="governance">Governance</SelectItem>
                          <SelectItem value="utility">Utility</SelectItem>
                          <SelectItem value="reward">Reward</SelectItem>
                          <SelectItem value="achievement">Achievement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience_value">Experience Value</Label>
                      <Input
                        id="experience_value"
                        type="number"
                        min="0"
                        value={currentConfig.experience_value || 0}
                        onChange={(e) => updateCurrentConfig("experience_value", parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Economic Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Economic Configuration</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="supply_cap" className="flex items-center">
                        Supply Cap
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Maximum supply for this token type (leave blank for unlimited)</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="supply_cap"
                        type="number"
                        min="1"
                        value={currentConfig.supply_cap || ""}
                        onChange={(e) => updateCurrentConfig("supply_cap", e.target.value)}
                        placeholder="Leave blank for unlimited"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mint_price" className="flex items-center">
                        Mint Price (ETH)
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Price to mint this token type</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        id="mint_price"
                        type="number"
                        min="0"
                        step="0.000001"
                        value={currentConfig.mint_price || ""}
                        onChange={(e) => updateCurrentConfig("mint_price", e.target.value)}
                        placeholder="0.01"
                      />
                    </div>
                  </div>
                </div>

                {/* Transfer & Trading Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Transfer & Trading</h4>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Tradeable</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Whether this token type can be traded on marketplaces</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={currentConfig.is_tradeable}
                        onCheckedChange={(checked) => updateCurrentConfig("is_tradeable", checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Transferable</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Whether this token type can be transferred between users</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={currentConfig.is_transferable}
                        onCheckedChange={(checked) => updateCurrentConfig("is_transferable", checked)}
                      />
                    </div>
                  </div>
                </div>

                {/* Crafting & Gaming Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Crafting & Gaming</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="crafting_materials" className="flex items-center">
                        Crafting Materials (JSON)
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Materials obtained when this token is used in crafting</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Textarea
                        id="crafting_materials"
                        value={typeof currentConfig.crafting_materials === 'object' 
                          ? JSON.stringify(currentConfig.crafting_materials, null, 2) 
                          : currentConfig.crafting_materials || ''
                        }
                        onChange={(e) => updateCraftingMaterials(e.target.value)}
                        placeholder={`{
  "wood": 5,
  "metal": 2,
  "gems": 1
}`}
                        className="min-h-20 font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="burn_rewards" className="flex items-center">
                        Burn Rewards (JSON)
                        <Tooltip>
                          <TooltipTrigger className="ml-1.5">
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Rewards given when this token is burned</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Textarea
                        id="burn_rewards"
                        value={typeof currentConfig.burn_rewards === 'object' 
                          ? JSON.stringify(currentConfig.burn_rewards, null, 2) 
                          : currentConfig.burn_rewards || ''
                        }
                        onChange={(e) => updateBurnRewards(e.target.value)}
                        placeholder={`{
  "tokens": {
    "2": 10,
    "3": 5
  },
  "experience": 50
}`}
                        className="min-h-20 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTypeConfig}>
                    {editingIndex !== null ? 'Update' : 'Add'} Configuration
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC1155TypeConfigsForm;