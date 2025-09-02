import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * ERC20BaseForm - Base token fields from main tokens table
 * 
 * Handles core token information that applies to all token standards:
 * - name, symbol, decimals (required fields)
 * - description, total_supply (optional fields)
 * - standard is set to 'ERC-20' automatically
 * 
 * These fields are stored in the main 'tokens' table
 */

interface ERC20BaseFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC20BaseForm: React.FC<ERC20BaseFormProps> = ({ 
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
          <CardTitle className="text-lg font-semibold">Core Token Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center">
                Token Name
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">The full name of your token (e.g., "Ethereum")</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="My Token"
                value={tokenForm.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
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
                    <p className="max-w-xs">The trading symbol for your token (e.g., "ETH")</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="symbol"
                name="symbol"
                placeholder="TKN"
                value={tokenForm.symbol || ""}
                onChange={(e) => handleChange("symbol", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="decimals" className="flex items-center">
                Decimals
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Number of decimal places (18 is standard)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="decimals"
                name="decimals"
                placeholder="18"
                value={tokenForm.decimals ?? 18}
                onChange={(e) => handleChange("decimals", parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalSupply" className="flex items-center">
                Total Supply
                <Tooltip>
                  <TooltipTrigger className="ml-1.5">
                    <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Total token supply (can be set later if mintable)</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                id="totalSupply"
                name="totalSupply"
                placeholder="1000000"
                value={tokenForm.total_supply || ""}
                onChange={(e) => handleChange("total_supply", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="A brief description of your token's purpose and utility"
              value={tokenForm.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="min-h-20"
            />
          </div>

          {/* Standard is automatically set to ERC-20 */}
          <input type="hidden" name="standard" value="ERC-20" />
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC20BaseForm;