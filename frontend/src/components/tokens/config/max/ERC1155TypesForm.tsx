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

interface TokenType {
  id: string;
  token_type_id: string;
  name?: string;
  description?: string;
  max_supply?: string;
  metadata?: any;
  fungibility_type?: string;
  created_at?: string;
  updated_at?: string;
}

interface ERC1155TypesFormProps {
  tokenTypes: TokenType[];
  onChange: (tokenTypes: TokenType[]) => void;
}

/**
 * ERC-1155 Token Types Form Component
 * Manages token_erc1155_types table data
 * Handles token type definitions, metadata, and configuration
 */
const ERC1155TypesForm: React.FC<ERC1155TypesFormProps> = ({ tokenTypes = [], onChange }) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentTokenType, setCurrentTokenType] = useState<TokenType>({
    id: "",
    token_type_id: "",
    name: "",
    description: "",
    max_supply: "",
    metadata: {},
    fungibility_type: "fungible"
  });

  // Generate new token type ID
  const generateNewTokenTypeId = () => {
    const existingIds = tokenTypes.map(t => parseInt(t.token_type_id) || 0);
    const maxId = Math.max(...existingIds, 0);
    return (maxId + 1).toString();
  };

  // Add new token type
  const addTokenType = () => {
    setCurrentTokenType({
      id: crypto.randomUUID(),
      token_type_id: generateNewTokenTypeId(),
      name: "",
      description: "",
      max_supply: "",
      metadata: {},
      fungibility_type: "fungible"
    });
    setEditingIndex(null);
    setIsDialogOpen(true);
  };

  // Edit existing token type
  const editTokenType = (index: number) => {
    setCurrentTokenType({ ...tokenTypes[index] });
    setEditingIndex(index);
    setIsDialogOpen(true);
  };

  // Save token type
  const saveTokenType = () => {
    const updatedTokenTypes = [...tokenTypes];
    
    if (editingIndex !== null) {
      // Update existing
      updatedTokenTypes[editingIndex] = currentTokenType;
    } else {
      // Add new
      updatedTokenTypes.push(currentTokenType);
    }
    
    onChange(updatedTokenTypes);
    setIsDialogOpen(false);
    setEditingIndex(null);
  };

  // Remove token type
  const removeTokenType = (index: number) => {
    if (tokenTypes.length <= 1) {
      return; // Keep at least one token type
    }
    
    const updatedTokenTypes = tokenTypes.filter((_, i) => i !== index);
    onChange(updatedTokenTypes);
  };

  // Update current token type being edited
  const updateCurrentTokenType = (field: string, value: any) => {
    setCurrentTokenType(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update metadata
  const updateMetadata = (key: string, value: any) => {
    setCurrentTokenType(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Token Types Management</CardTitle>
          <Button onClick={addTokenType} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Token Type
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tokenTypes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No token types defined yet.</p>
                <p className="text-sm">Click "Add Token Type" to create your first token type.</p>
              </div>
            ) : (
              tokenTypes.map((tokenType, index) => (
                <div key={tokenType.id || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">Token ID: {tokenType.token_type_id}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          tokenType.fungibility_type === 'fungible' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {tokenType.fungibility_type || 'fungible'}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{tokenType.name || 'Unnamed Token Type'}</p>
                      {tokenType.description && (
                        <p className="text-sm text-muted-foreground mt-1">{tokenType.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {tokenType.max_supply && (
                          <span>Max Supply: {tokenType.max_supply}</span>
                        )}
                        {tokenType.metadata && Object.keys(tokenType.metadata).length > 0 && (
                          <span>Metadata: {Object.keys(tokenType.metadata).length} properties</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editTokenType(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {tokenTypes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTokenType(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Token Type Edit Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingIndex !== null ? 'Edit Token Type' : 'Add Token Type'}
                </DialogTitle>
                <DialogDescription>
                  Configure the properties for this token type. Each token type represents a unique asset in your collection.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="token_type_id" className="flex items-center">
                      Token Type ID *
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Unique identifier for this token type</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      id="token_type_id"
                      value={currentTokenType.token_type_id}
                      onChange={(e) => updateCurrentTokenType("token_type_id", e.target.value)}
                      placeholder="1"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fungibility_type" className="flex items-center">
                      Fungibility Type
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5">
                          <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">Whether this token type is fungible or non-fungible</p>
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select 
                      value={currentTokenType.fungibility_type || "fungible"} 
                      onValueChange={(value) => updateCurrentTokenType("fungibility_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fungibility type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fungible">Fungible</SelectItem>
                        <SelectItem value="non-fungible">Non-Fungible</SelectItem>
                        <SelectItem value="semi-fungible">Semi-Fungible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Token Name</Label>
                  <Input
                    id="name"
                    value={currentTokenType.name || ""}
                    onChange={(e) => updateCurrentTokenType("name", e.target.value)}
                    placeholder="Gold Coin"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={currentTokenType.description || ""}
                    onChange={(e) => updateCurrentTokenType("description", e.target.value)}
                    placeholder="Describe this token type..."
                    className="min-h-20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_supply" className="flex items-center">
                    Maximum Supply
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Maximum number of tokens of this type that can be minted (leave blank for unlimited)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id="max_supply"
                    type="number"
                    min="1"
                    value={currentTokenType.max_supply || ""}
                    onChange={(e) => updateCurrentTokenType("max_supply", e.target.value)}
                    placeholder="Leave blank for unlimited"
                  />
                </div>

                {/* Metadata Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Custom Metadata Properties</Label>
                  <div className="space-y-3">
                    {/* Common metadata properties */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="image">Image URL</Label>
                        <Input
                          id="image"
                          value={currentTokenType.metadata?.image || ""}
                          onChange={(e) => updateMetadata("image", e.target.value)}
                          placeholder="https://... or ipfs://..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="external_url">External URL</Label>
                        <Input
                          id="external_url"
                          value={currentTokenType.metadata?.external_url || ""}
                          onChange={(e) => updateMetadata("external_url", e.target.value)}
                          placeholder="https://yourwebsite.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="animation_url">Animation URL</Label>
                        <Input
                          id="animation_url"
                          value={currentTokenType.metadata?.animation_url || ""}
                          onChange={(e) => updateMetadata("animation_url", e.target.value)}
                          placeholder="https://... (video/audio/3D)"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="background_color">Background Color</Label>
                        <Input
                          id="background_color"
                          value={currentTokenType.metadata?.background_color || ""}
                          onChange={(e) => updateMetadata("background_color", e.target.value)}
                          placeholder="#FFFFFF (hex color)"
                        />
                      </div>
                    </div>

                    {/* Custom attributes */}
                    <div className="space-y-2">
                      <Label htmlFor="attributes">Attributes (JSON)</Label>
                      <Textarea
                        id="attributes"
                        value={currentTokenType.metadata?.attributes ? JSON.stringify(currentTokenType.metadata.attributes, null, 2) : ""}
                        onChange={(e) => {
                          try {
                            const attributes = e.target.value ? JSON.parse(e.target.value) : null;
                            updateMetadata("attributes", attributes);
                          } catch (error) {
                            // Invalid JSON, but don't clear the field
                          }
                        }}
                        placeholder={`[
  {
    "trait_type": "Rarity",
    "value": "Common"
  },
  {
    "trait_type": "Power",
    "value": 100
  }
]`}
                        className="min-h-32 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveTokenType}>
                    {editingIndex !== null ? 'Update' : 'Add'} Token Type
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

export default ERC1155TypesForm;