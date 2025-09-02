import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Edit } from "lucide-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface CraftingRecipe {
  id: string;
  recipe_name: string;
  input_tokens: any;
  output_token_type_id: string;
  output_quantity: number;
  success_rate: number;
  cooldown_period: number;
  required_level: number;
  is_active: boolean;
}

interface ERC1155GamingFormProps {
  config: any;
  craftingRecipes: CraftingRecipe[];
  onChange: (field: string, value: any) => void;
  onCraftingRecipesChange: (recipes: CraftingRecipe[]) => void;
}

/**
 * ERC-1155 Gaming & Utility Form Component
 * Handles gaming mechanics, crafting, leveling, and utility features
 * Covers token_erc1155_crafting_recipes table and gaming-related fields
 */
const ERC1155GamingForm: React.FC<ERC1155GamingFormProps> = ({ 
  config, 
  craftingRecipes = [], 
  onChange, 
  onCraftingRecipesChange 
}) => {
  const [isRecipeDialogOpen, setIsRecipeDialogOpen] = useState(false);
  const [editingRecipeIndex, setEditingRecipeIndex] = useState<number | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<CraftingRecipe>({
    id: "",
    recipe_name: "",
    input_tokens: {},
    output_token_type_id: "1",
    output_quantity: 1,
    success_rate: 100,
    cooldown_period: 0,
    required_level: 1,
    is_active: true
  });

  // Handle config changes
  const handleConfigChange = (field: string, value: any) => {
    onChange(field, value);
  };

  // Add new crafting recipe
  const addRecipe = () => {
    setCurrentRecipe({
      id: "",
      recipe_name: "",
      input_tokens: {},
      output_token_type_id: "1",
      output_quantity: 1,
      success_rate: 100,
      cooldown_period: 0,
      required_level: 1,
      is_active: true
    });
    setEditingRecipeIndex(null);
    setIsRecipeDialogOpen(true);
  };

  // Edit existing recipe
  const editRecipe = (index: number) => {
    setCurrentRecipe({ ...craftingRecipes[index] });
    setEditingRecipeIndex(index);
    setIsRecipeDialogOpen(true);
  };

  // Save recipe
  const saveRecipe = () => {
    const updatedRecipes = [...craftingRecipes];
    
    if (editingRecipeIndex !== null) {
      updatedRecipes[editingRecipeIndex] = currentRecipe;
    } else {
      updatedRecipes.push({ ...currentRecipe, id: crypto.randomUUID() });
    }
    
    onCraftingRecipesChange(updatedRecipes);
    setIsRecipeDialogOpen(false);
    setEditingRecipeIndex(null);
  };

  // Remove recipe
  const removeRecipe = (index: number) => {
    const updatedRecipes = craftingRecipes.filter((_, i) => i !== index);
    onCraftingRecipesChange(updatedRecipes);
  };

  // Update current recipe
  const updateCurrentRecipe = (field: string, value: any) => {
    setCurrentRecipe(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Gaming Features Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Gaming & Utility Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Crafting System</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Enable token crafting and combining mechanics</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.crafting_enabled || false}
                  onCheckedChange={(checked) => handleConfigChange("crafting_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Token Fusion</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow fusing multiple tokens into new ones</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.fusion_enabled || false}
                  onCheckedChange={(checked) => handleConfigChange("fusion_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Experience Points</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Enable experience point system for tokens</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.experience_points_enabled || false}
                  onCheckedChange={(checked) => handleConfigChange("experience_points_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Leveling System</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Enable token leveling and progression</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.leveling_enabled || false}
                  onCheckedChange={(checked) => handleConfigChange("leveling_enabled", checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">Consumable Tokens</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Allow tokens to be consumed/used in gameplay</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={config.consumable_tokens || false}
                  onCheckedChange={(checked) => handleConfigChange("consumable_tokens", checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Crafting Recipes */}
        {config.crafting_enabled && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Crafting Recipes</CardTitle>
              <Button onClick={addRecipe} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Recipe
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {craftingRecipes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No crafting recipes defined yet.</p>
                    <p className="text-sm">Click "Add Recipe" to create your first crafting recipe.</p>
                  </div>
                ) : (
                  craftingRecipes.map((recipe, index) => (
                    <div key={recipe.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{recipe.recipe_name || 'Unnamed Recipe'}</h4>
                            <span className={`px-2 py-1 rounded text-xs ${
                              recipe.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {recipe.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Output: {recipe.output_quantity} × Token Type {recipe.output_token_type_id}</p>
                            <p>Success Rate: {recipe.success_rate}%</p>
                            {recipe.cooldown_period > 0 && (
                              <p>Cooldown: {recipe.cooldown_period} seconds</p>
                            )}
                            {recipe.required_level > 1 && (
                              <p>Required Level: {recipe.required_level}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editRecipe(index)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRecipe(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Recipe Edit Dialog */}
              <Dialog open={isRecipeDialogOpen} onOpenChange={setIsRecipeDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRecipeIndex !== null ? 'Edit Crafting Recipe' : 'Add Crafting Recipe'}
                    </DialogTitle>
                    <DialogDescription>
                      Define how players can combine tokens to create new ones.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipe_name">Recipe Name *</Label>
                      <Input
                        id="recipe_name"
                        value={currentRecipe.recipe_name}
                        onChange={(e) => updateCurrentRecipe("recipe_name", e.target.value)}
                        placeholder="Forge Sword"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="output_token_type_id">Output Token Type *</Label>
                        <Input
                          id="output_token_type_id"
                          value={currentRecipe.output_token_type_id}
                          onChange={(e) => updateCurrentRecipe("output_token_type_id", e.target.value)}
                          placeholder="1"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="output_quantity">Output Quantity</Label>
                        <Input
                          id="output_quantity"
                          type="number"
                          min="1"
                          value={currentRecipe.output_quantity}
                          onChange={(e) => updateCurrentRecipe("output_quantity", parseInt(e.target.value) || 1)}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="input_tokens">Input Tokens (JSON) *</Label>
                      <Textarea
                        id="input_tokens"
                        value={typeof currentRecipe.input_tokens === 'object' 
                          ? JSON.stringify(currentRecipe.input_tokens, null, 2) 
                          : currentRecipe.input_tokens
                        }
                        onChange={(e) => {
                          try {
                            const inputTokens = JSON.parse(e.target.value);
                            updateCurrentRecipe("input_tokens", inputTokens);
                          } catch (error) {
                            // Invalid JSON, but don't clear the field
                            updateCurrentRecipe("input_tokens", e.target.value);
                          }
                        }}
                        placeholder={`{
  "1": 2,
  "2": 1
}`}
                        className="min-h-20 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: {`{"tokenTypeId": quantity, "2": 3, "5": 1}`}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="success_rate">Success Rate (%)</Label>
                        <Input
                          id="success_rate"
                          type="number"
                          min="1"
                          max="100"
                          value={currentRecipe.success_rate}
                          onChange={(e) => updateCurrentRecipe("success_rate", parseInt(e.target.value) || 100)}
                          placeholder="100"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="required_level">Required Level</Label>
                        <Input
                          id="required_level"
                          type="number"
                          min="1"
                          value={currentRecipe.required_level}
                          onChange={(e) => updateCurrentRecipe("required_level", parseInt(e.target.value) || 1)}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cooldown_period">Cooldown Period (seconds)</Label>
                      <Input
                        id="cooldown_period"
                        type="number"
                        min="0"
                        value={currentRecipe.cooldown_period}
                        onChange={(e) => updateCurrentRecipe("cooldown_period", parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={currentRecipe.is_active}
                        onCheckedChange={(checked) => updateCurrentRecipe("is_active", checked)}
                      />
                      <Label>Active Recipe</Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsRecipeDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveRecipe}>
                        {editingRecipeIndex !== null ? 'Update' : 'Add'} Recipe
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Advanced Gaming Features */}
        <Card>
          <CardHeader>
            <CardTitle>Advanced Gaming Features</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" defaultValue={["governance"]}>
              {/* Governance & Community */}
              <AccordionItem value="governance">
                <AccordionTrigger>Governance & Community</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Voting Power</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Enable token-based voting rights</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.voting_power_enabled || false}
                        onCheckedChange={(checked) => handleConfigChange("voting_power_enabled", checked)}
                      />
                    </div>

                    {config.voting_power_enabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="voting_weight_per_token">Voting Weight Configuration (JSON)</Label>
                          <Textarea
                            id="voting_weight_per_token"
                            value={typeof config.voting_weight_per_token === 'object' 
                              ? JSON.stringify(config.voting_weight_per_token, null, 2) 
                              : config.voting_weight_per_token || ''
                            }
                            onChange={(e) => {
                              try {
                                const weights = JSON.parse(e.target.value);
                                handleConfigChange("voting_weight_per_token", weights);
                              } catch (error) {
                                // Invalid JSON, but don't clear the field
                              }
                            }}
                            placeholder={`{
  "1": 1,
  "2": 5,
  "3": 10
}`}
                            className="min-h-20 font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Format: {`{"tokenTypeId": votingWeight}`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Community Treasury</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Enable community treasury for governance</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={config.community_treasury_enabled || false}
                            onCheckedChange={(checked) => handleConfigChange("community_treasury_enabled", checked)}
                          />
                        </div>

                        {config.community_treasury_enabled && (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="treasury_percentage">Treasury Percentage (%)</Label>
                              <Input
                                id="treasury_percentage"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={config.treasury_percentage || ""}
                                onChange={(e) => handleConfigChange("treasury_percentage", e.target.value)}
                                placeholder="5.0"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="proposal_creation_threshold">Proposal Threshold</Label>
                              <Input
                                id="proposal_creation_threshold"
                                value={config.proposal_creation_threshold || ""}
                                onChange={(e) => handleConfigChange("proposal_creation_threshold", e.target.value)}
                                placeholder="100"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Cross-Chain Features */}
              <AccordionItem value="crosschain">
                <AccordionTrigger>Cross-Chain & Interoperability</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Bridge Support</span>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">Enable cross-chain bridging functionality</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Switch
                        checked={config.bridge_enabled || false}
                        onCheckedChange={(checked) => handleConfigChange("bridge_enabled", checked)}
                      />
                    </div>

                    {config.bridge_enabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="bridgeable_token_types">Bridgeable Token Types (comma-separated)</Label>
                          <Input
                            id="bridgeable_token_types"
                            value={Array.isArray(config.bridgeable_token_types) ? config.bridgeable_token_types.join(', ') : ''}
                            onChange={(e) => handleConfigChange("bridgeable_token_types", e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                            placeholder="1, 2, 3"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="wrapped_versions">Wrapped Versions Configuration (JSON)</Label>
                          <Textarea
                            id="wrapped_versions"
                            value={typeof config.wrapped_versions === 'object' 
                              ? JSON.stringify(config.wrapped_versions, null, 2) 
                              : config.wrapped_versions || ''
                            }
                            onChange={(e) => {
                              try {
                                const wrapped = JSON.parse(e.target.value);
                                handleConfigChange("wrapped_versions", wrapped);
                              } catch (error) {
                                // Invalid JSON, but don't clear the field
                              }
                            }}
                            placeholder={`{
  "polygon": "0x123...",
  "bsc": "0x456...",
  "arbitrum": "0x789..."
}`}
                            className="min-h-20 font-mono text-sm"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">Layer 2 Support</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Enable Layer 2 scaling solutions</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Switch
                            checked={config.layer2_support_enabled || false}
                            onCheckedChange={(checked) => handleConfigChange("layer2_support_enabled", checked)}
                          />
                        </div>

                        {config.layer2_support_enabled && (
                          <div className="space-y-2">
                            <Label htmlFor="supported_layer2_networks">Supported Layer 2 Networks (comma-separated)</Label>
                            <Input
                              id="supported_layer2_networks"
                              value={Array.isArray(config.supported_layer2_networks) ? config.supported_layer2_networks.join(', ') : ''}
                              onChange={(e) => handleConfigChange("supported_layer2_networks", e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                              placeholder="polygon, arbitrum, optimism"
                            />
                          </div>
                        )}
                      </div>
                    )}
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

export default ERC1155GamingForm;