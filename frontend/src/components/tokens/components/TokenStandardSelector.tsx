/**
 * Component for selecting a token standard with compact visual cards
 */
import React from 'react';
import { TokenStandard } from '@/types/core/centralModels';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoCircledIcon, CheckCircledIcon } from "@radix-ui/react-icons";
import { cn } from "@/utils/shared/utils";

interface TokenStandardSelectorProps {
  selectedStandard: TokenStandard;
  onChange: (standard: TokenStandard) => void;
  disabled?: boolean;
}

const TokenStandardSelector: React.FC<TokenStandardSelectorProps> = ({
  selectedStandard,
  onChange,
  disabled = false
}) => {
  // Standard information with descriptions and use cases
  const standardInfo = [
    {
      standard: TokenStandard.ERC20,
      name: "ERC-20",
      description: "Fungible tokens, identical and interchangeable",
      useCase: "Currencies, utility tokens, shares, commodities",
      fungibility: "Fully Fungible",
      divisibility: "Divisible",
      color: "bg-blue-500",
      lightColor: "bg-blue-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-600"
    },
    {
      standard: TokenStandard.ERC721,
      name: "ERC-721",
      description: "Non-fungible tokens (NFTs), unique and indivisible",
      useCase: "Unique assets, real estate, IP rights, collectibles",
      fungibility: "Non-Fungible",
      divisibility: "Indivisible",
      color: "bg-purple-500",
      lightColor: "bg-purple-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-600"
    },
    {
      standard: TokenStandard.ERC1155,
      name: "ERC-1155",
      description: "Multi-token standard for both fungible and non-fungible tokens",
      useCase: "Gaming items, asset bundles, mixed collections",
      fungibility: "Mixed",
      divisibility: "Configurable",
      color: "bg-amber-500",
      lightColor: "bg-amber-50",
      borderColor: "border-amber-200",
      textColor: "text-amber-600"
    },
    {
      standard: TokenStandard.ERC1400,
      name: "ERC-1400",
      description: "Security tokens with compliance features",
      useCase: "Regulated securities, equity shares, debt instruments",
      fungibility: "Fungible with Restrictions",
      divisibility: "Divisible",
      color: "bg-green-500",
      lightColor: "bg-green-50",
      borderColor: "border-green-200",
      textColor: "text-green-600"
    },
    {
      standard: TokenStandard.ERC3525,
      name: "ERC-3525",
      description: "Semi-fungible tokens combining uniqueness with fractionalization",
      useCase: "Financial derivatives, structured products, fractional ownership",
      fungibility: "Semi-Fungible",
      divisibility: "Divisible Values",
      color: "bg-pink-500",
      lightColor: "bg-pink-50",
      borderColor: "border-pink-200",
      textColor: "text-pink-600"
    },
    {
      standard: TokenStandard.ERC4626,
      name: "ERC-4626",
      description: "Tokenized vaults for yield-generating assets",
      useCase: "Yield farming, staking pools, interest-bearing tokens",
      fungibility: "Fungible (Yield-Bearing)",
      divisibility: "Divisible",
      color: "bg-cyan-500",
      lightColor: "bg-cyan-50",
      borderColor: "border-cyan-200",
      textColor: "text-cyan-600"
    }
  ];

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <h3 className="text-lg font-medium">Select Token Standard</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {standardInfo.map((info) => {
            const isSelected = selectedStandard === info.standard;
            
            return (
              <Card 
                key={info.standard}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  isSelected 
                    ? `${info.borderColor} ${info.lightColor} border-2` 
                    : "border border-gray-200 hover:border-gray-300",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !disabled && onChange(info.standard)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header with badge and selection indicator */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        className={cn(
                          info.color,
                          "text-white px-2.5 py-1 text-sm font-medium"
                        )}
                      >
                        {info.name}
                      </Badge>
                      {isSelected && (
                        <CheckCircledIcon className={cn("h-5 w-5", info.textColor)} />
                      )}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-900">
                        {info.description}
                      </p>
                    </div>

                    {/* Use Cases */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Common Use Cases
                      </p>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {info.useCase}
                      </p>
                    </div>

                    {/* Technical Details */}
                    <div className="pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 font-medium">Fungibility</p>
                          <p className="text-gray-700 font-medium">{info.fungibility}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-medium">Divisibility</p>
                          <p className="text-gray-700 font-medium">{info.divisibility}</p>
                        </div>
                      </div>
                    </div>

                    {/* Info tooltip */}
                    <div className="flex justify-end">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoCircledIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-2">
                            <p className="font-medium">{info.name} Standard</p>
                            <p className="text-sm">{info.description}</p>
                            <div className="border-t pt-2">
                              <p className="text-xs font-medium">Best for:</p>
                              <p className="text-xs">{info.useCase}</p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TokenStandardSelector;