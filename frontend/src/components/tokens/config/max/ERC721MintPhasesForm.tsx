import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, TrashIcon, InfoCircledIcon, CalendarIcon } from "@radix-ui/react-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

/**
 * ERC721MintPhasesForm - Mint phases from token_erc721_mint_phases table
 * 
 * Handles sequential minting phases for controlled NFT launches:
 * - phase_name: Name of the phase (e.g., "Presale", "Public Sale", "Allowlist")
 * - phase_order: Order of execution (1, 2, 3...)
 * - start_time/end_time: Phase duration
 * - max_supply: Maximum NFTs available in this phase
 * - price: ETH price per NFT in this phase
 * - max_per_wallet: Maximum NFTs per wallet in this phase
 * - whitelist_required: Whether this phase requires whitelist membership
 * - merkle_root: Merkle root for whitelist verification
 * - is_active: Whether the phase is currently active
 * 
 * Enables complex launch strategies like presale → allowlist → public mint
 */

interface MintPhase {
  id?: string;
  phase_name: string;
  phase_order: number;
  start_time: string;
  end_time: string;
  max_supply: number | null;
  price: string;
  max_per_wallet: number | null;
  whitelist_required: boolean;
  merkle_root: string;
  is_active: boolean;
}

interface ERC721MintPhasesFormProps {
  tokenForm: any;
  onInputChange: (field: string, value: any) => void;
}

const ERC721MintPhasesForm: React.FC<ERC721MintPhasesFormProps> = ({ 
  tokenForm = {},
  onInputChange
}) => {
  const [phases, setPhases] = useState<MintPhase[]>(() => {
    return tokenForm.mint_phases || [
      {
        phase_name: "Presale",
        phase_order: 1,
        start_time: "",
        end_time: "",
        max_supply: null,
        price: "",
        max_per_wallet: null,
        whitelist_required: true,
        merkle_root: "",
        is_active: false
      }
    ];
  });

  // Update parent when phases change
  useEffect(() => {
    onInputChange("mint_phases", phases);
  }, [phases, onInputChange]);

  const addPhase = () => {
    const nextOrder = Math.max(...phases.map(p => p.phase_order || 0)) + 1;
    setPhases(prev => [
      ...prev,
      {
        phase_name: "",
        phase_order: nextOrder,
        start_time: "",
        end_time: "",
        max_supply: null,
        price: "",
        max_per_wallet: null,
        whitelist_required: false,
        merkle_root: "",
        is_active: false
      }
    ]);
  };

  const removePhase = (index: number) => {
    setPhases(prev => {
      const newPhases = prev.filter((_, i) => i !== index);
      // Reorder phases
      return newPhases.map((phase, i) => ({
        ...phase,
        phase_order: i + 1
      }));
    });
  };

  const updatePhase = (index: number, field: keyof MintPhase, value: any) => {
    setPhases(prev => prev.map((phase, i) => 
      i === index ? { ...phase, [field]: value } : phase
    ));
  };

  const movePhaseUp = (index: number) => {
    if (index === 0) return;
    setPhases(prev => {
      const newPhases = [...prev];
      [newPhases[index - 1], newPhases[index]] = [newPhases[index], newPhases[index - 1]];
      return newPhases.map((phase, i) => ({
        ...phase,
        phase_order: i + 1
      }));
    });
  };

  const movePhaseDown = (index: number) => {
    if (index === phases.length - 1) return;
    setPhases(prev => {
      const newPhases = [...prev];
      [newPhases[index], newPhases[index + 1]] = [newPhases[index + 1], newPhases[index]];
      return newPhases.map((phase, i) => ({
        ...phase,
        phase_order: i + 1
      }));
    });
  };

  // Predefined phase templates
  const phaseTemplates = [
    {
      name: "Presale",
      whitelist_required: true,
      suggested_price: "0.05",
      suggested_max_per_wallet: 2
    },
    {
      name: "Allowlist",
      whitelist_required: true,
      suggested_price: "0.07",
      suggested_max_per_wallet: 5
    },
    {
      name: "Public Sale",
      whitelist_required: false,
      suggested_price: "0.08",
      suggested_max_per_wallet: 10
    },
    {
      name: "Dutch Auction",
      whitelist_required: false,
      suggested_price: "0.5",
      suggested_max_per_wallet: 3
    },
    {
      name: "Free Mint",
      whitelist_required: false,
      suggested_price: "0",
      suggested_max_per_wallet: 1
    }
  ];

  const applyTemplate = (index: number, template: typeof phaseTemplates[0]) => {
    updatePhase(index, 'phase_name', template.name);
    updatePhase(index, 'whitelist_required', template.whitelist_required);
    updatePhase(index, 'price', template.suggested_price);
    updatePhase(index, 'max_per_wallet', template.suggested_max_per_wallet);
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center">
            Mint Phases Configuration
            <Tooltip>
              <TooltipTrigger className="ml-2">
                <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">
                  Define sequential minting phases for your NFT launch. 
                  Each phase can have different pricing, supply limits, and access requirements.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Create a structured launch strategy with multiple minting phases.
          </div>

          {/* Phase Templates */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-3">Quick Templates</div>
            <div className="flex flex-wrap gap-2">
              {phaseTemplates.map((template, idx) => (
                <Button
                  key={idx}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const lastPhase = phases.length - 1;
                    applyTemplate(lastPhase, template);
                  }}
                  className="text-xs"
                >
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          {phases.map((phase, phaseIndex) => (
            <div key={phaseIndex} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Phase {phase.phase_order}
                  </Badge>
                  {phase.is_active && (
                    <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                      Active
                    </Badge>
                  )}
                  {phase.whitelist_required && (
                    <Badge variant="secondary" className="text-xs">
                      Whitelist
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1">
                  {phaseIndex > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => movePhaseUp(phaseIndex)}
                      className="h-6 w-6 p-0"
                    >
                      ↑
                    </Button>
                  )}
                  {phaseIndex < phases.length - 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => movePhaseDown(phaseIndex)}
                      className="h-6 w-6 p-0"
                    >
                      ↓
                    </Button>
                  )}
                  {phases.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhase(phaseIndex)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`phaseName-${phaseIndex}`}>
                    Phase Name *
                  </Label>
                  <Input
                    id={`phaseName-${phaseIndex}`}
                    placeholder="e.g., Presale, Public Sale"
                    value={phase.phase_name}
                    onChange={(e) => updatePhase(phaseIndex, 'phase_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`price-${phaseIndex}`} className="flex items-center">
                    Price (ETH) *
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Price per NFT in this phase (use 0 for free mint)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id={`price-${phaseIndex}`}
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.08"
                    value={phase.price}
                    onChange={(e) => updatePhase(phaseIndex, 'price', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`startTime-${phaseIndex}`}>
                    Start Time
                  </Label>
                  <Input
                    id={`startTime-${phaseIndex}`}
                    type="datetime-local"
                    value={phase.start_time}
                    onChange={(e) => updatePhase(phaseIndex, 'start_time', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`endTime-${phaseIndex}`}>
                    End Time
                  </Label>
                  <Input
                    id={`endTime-${phaseIndex}`}
                    type="datetime-local"
                    value={phase.end_time}
                    onChange={(e) => updatePhase(phaseIndex, 'end_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`maxSupply-${phaseIndex}`}>
                    Max Supply (Phase)
                  </Label>
                  <Input
                    id={`maxSupply-${phaseIndex}`}
                    type="number"
                    min="1"
                    placeholder="1000"
                    value={phase.max_supply || ""}
                    onChange={(e) => updatePhase(phaseIndex, 'max_supply', parseInt(e.target.value) || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`maxPerWallet-${phaseIndex}`}>
                    Max Per Wallet
                  </Label>
                  <Input
                    id={`maxPerWallet-${phaseIndex}`}
                    type="number"
                    min="1"
                    placeholder="5"
                    value={phase.max_per_wallet || ""}
                    onChange={(e) => updatePhase(phaseIndex, 'max_per_wallet', parseInt(e.target.value) || null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">Whitelist Required</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Only addresses on the whitelist can mint in this phase</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Switch
                    checked={phase.whitelist_required}
                    onCheckedChange={(checked) => updatePhase(phaseIndex, 'whitelist_required', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Active</span>
                  <Switch
                    checked={phase.is_active}
                    onCheckedChange={(checked) => updatePhase(phaseIndex, 'is_active', checked)}
                  />
                </div>
              </div>

              {phase.whitelist_required && (
                <div className="space-y-2">
                  <Label htmlFor={`merkleRoot-${phaseIndex}`} className="flex items-center">
                    Merkle Root (Optional)
                    <Tooltip>
                      <TooltipTrigger className="ml-1.5">
                        <InfoCircledIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Merkle root for efficient whitelist verification (can be set later)</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    id={`merkleRoot-${phaseIndex}`}
                    placeholder="0x... (can be set later)"
                    value={phase.merkle_root}
                    onChange={(e) => updatePhase(phaseIndex, 'merkle_root', e.target.value)}
                  />
                </div>
              )}

              {/* Phase Preview */}
              {phase.phase_name && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="text-sm font-medium mb-2">Phase Preview:</div>
                  <div className="text-sm space-y-1">
                    <div><span className="font-medium">Name:</span> {phase.phase_name}</div>
                    <div><span className="font-medium">Price:</span> {phase.price || '0'} ETH</div>
                    {phase.max_supply && <div><span className="font-medium">Supply:</span> {phase.max_supply} NFTs</div>}
                    {phase.max_per_wallet && <div><span className="font-medium">Max per wallet:</span> {phase.max_per_wallet}</div>}
                    <div><span className="font-medium">Access:</span> {phase.whitelist_required ? 'Whitelist Only' : 'Public'}</div>
                    {phase.start_time && phase.end_time && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(phase.start_time).toLocaleDateString()} - {new Date(phase.end_time).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addPhase}
            className="w-full"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Phase
          </Button>

          {/* Summary */}
          {phases.length > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-2">
                Launch Strategy Summary
              </div>
              <div className="text-sm text-green-800 space-y-1">
                <div>Total Phases: {phases.length}</div>
                <div>Active Phases: {phases.filter(p => p.is_active).length}</div>
                <div>Whitelist Phases: {phases.filter(p => p.whitelist_required).length}</div>
                {phases.some(p => p.max_supply) && (
                  <div>Total Phase Supply: {phases.reduce((sum, p) => sum + (p.max_supply || 0), 0)} NFTs</div>
                )}
              </div>
              <div className="text-xs text-green-700 mt-2">
                Phases will execute in the order defined above.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default ERC721MintPhasesForm;
