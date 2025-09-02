import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * ERC721BaseForm - Base NFT collection fields from main tokens table
 * 
 * Handles core token information that applies to all token standards:
 * - name, symbol (required fields for NFT collections)
 * - description, total_supply (optional fields)
 * - standard is set to 'ERC-721' automatically
 * - decimals is set to 0 for NFTs (non-fungible)
 * 
 * These fields are stored in the main 'tokens' table (25 columns)
 */

interface ERC721BaseFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC721BaseForm: React.FC<ERC721BaseFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const handleChange = (field: string, value: any) => {
    onInputChange(field, value);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">NFT Collection Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                Collection Name *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The full name of your NFT collection (e.g., "Bored Ape Yacht Club")</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="My NFT Collection"
                value={tokenForm.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol" className="flex items-center">
                Collection Symbol *
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The trading symbol for your collection (e.g., "BAYC")</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="MYNFT"
                value={tokenForm.symbol || ""}
                onChange={(e) => handleChange("symbol", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Collection Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="A brief description of your NFT collection, its purpose, and unique features"
              value={tokenForm.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalSupply" className="flex items-center">
              Total Supply (Optional)
              <Tooltip>
                <TooltipTrigger className="ml-1.5">
                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Total number of NFTs in the collection (can be set later or remain unlimited)</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Input
              id="totalSupply"
              name="totalSupply"
              type="number"
              min="1"
              placeholder="10000"
              value={tokenForm.total_supply || ""}
              onChange={(e) => handleChange("total_supply", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty for unlimited supply or set in advanced properties
            </p>
          </div>

          {/* Configuration Mode Selection */}
          <div className="space-y-2">
            <Label htmlFor="configMode" className="flex items-center">
              Configuration Mode
              <Tooltip>
                <TooltipTrigger className="ml-1.5">
                  <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Min: Basic NFT features only. Max: Full enterprise features including royalties, phases, utilities</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <Select 
              value={tokenForm.config_mode || "min"} 
              onValueChange={(value) => handleChange("config_mode", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select configuration mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="min">Minimal - Basic NFT Features</SelectItem>
                <SelectItem value="basic">Basic - Standard NFT Collection</SelectItem>
                <SelectItem value="advanced">Advanced - Enhanced Features</SelectItem>
                <SelectItem value="max">Maximum - Enterprise Features</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Hidden fields for NFT standard */}
          <input type="hidden" name="standard" value="ERC-721" />
          <input type="hidden" name="decimals" value="0" />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC721BaseForm;
