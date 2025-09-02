import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChevronDown, 
  ChevronRight, 
  Info, 
  X, 
  Shield, 
  Globe,
  MapPin,
  CheckCircle2,
  Search
} from "lucide-react";
import { cn } from "@/utils/utils";
import { RegulatoryExemptionService } from "@/services/compliance/regulatoryExemptionService";
import type { 
  RegulatoryExemption, 
  RegulatoryExemptionsByRegion 
} from "@/types/domain/compliance/regulatory";

interface RegulatoryExemptionsFieldProps {
  value: string[];
  onChange: (exemptionIds: string[]) => void;
  disabled?: boolean;
  className?: string;
}

interface ExemptionWithDetails extends RegulatoryExemption {
  isSelected: boolean;
}

interface RegionWithExemptions {
  region: string;
  countries: {
    country: string;
    exemptions: ExemptionWithDetails[];
  }[];
  isExpanded: boolean;
}

const RegulatoryExemptionsField: React.FC<RegulatoryExemptionsFieldProps> = ({
  value = [],
  onChange,
  disabled = false,
  className
}) => {
  const [exemptionsByRegion, setExemptionsByRegion] = useState<RegionWithExemptions[]>([]);
  const [filteredExemptionsByRegion, setFilteredExemptionsByRegion] = useState<RegionWithExemptions[]>([]);
  const [selectedExemptions, setSelectedExemptions] = useState<RegulatoryExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load regulatory exemptions on component mount
  useEffect(() => {
    loadRegulatoryExemptions();
  }, []);

  // Update selected exemptions when value prop changes
  useEffect(() => {
    if (exemptionsByRegion.length > 0) {
      const allExemptions = exemptionsByRegion.flatMap(region =>
        region.countries.flatMap(country => country.exemptions)
      );
      const selected = allExemptions.filter(exemption => value.includes(exemption.id));
      setSelectedExemptions(selected);
    }
  }, [value, exemptionsByRegion]);

  // Filter exemptions based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredExemptionsByRegion(exemptionsByRegion);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = exemptionsByRegion.map(region => ({
      ...region,
      countries: region.countries.map(country => ({
        ...country,
        exemptions: country.exemptions.filter(exemption =>
          exemption.exemptionType.toLowerCase().includes(query) ||
          exemption.explanation.toLowerCase().includes(query)
        )
      })).filter(country => country.exemptions.length > 0)
    })).filter(region => region.countries.length > 0);

    setFilteredExemptionsByRegion(filtered);
  }, [searchQuery, exemptionsByRegion]);

  const loadRegulatoryExemptions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await RegulatoryExemptionService.getRegulatoryExemptionsByRegion();
      
      if (response.success && response.data) {
        const regionsWithState: RegionWithExemptions[] = response.data.map(regionData => ({
          region: regionData.region,
          countries: regionData.countries.map(countryData => ({
            country: countryData.country,
            exemptions: countryData.exemptions.map(exemption => ({
              ...exemption,
              isSelected: value.includes(exemption.id)
            }))
          })),
          isExpanded: false
        }));
        
        setExemptionsByRegion(regionsWithState);
        setFilteredExemptionsByRegion(regionsWithState);
      } else {
        setError(response.error || 'Failed to load regulatory exemptions');
      }
    } catch (err) {
      setError('Failed to load regulatory exemptions');
      console.error('Error loading regulatory exemptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExemptionToggle = (exemption: RegulatoryExemption, checked: boolean) => {
    if (disabled) return;

    let newSelected: string[];
    
    if (checked) {
      newSelected = [...value, exemption.id];
    } else {
      newSelected = value.filter(id => id !== exemption.id);
    }
    
    onChange(newSelected);
    
    // Update local state for UI
    setExemptionsByRegion(prev => 
      prev.map(region => ({
        ...region,
        countries: region.countries.map(country => ({
          ...country,
          exemptions: country.exemptions.map(ex => 
            ex.id === exemption.id ? { ...ex, isSelected: checked } : ex
          )
        }))
      }))
    );
  };

  const handleRemoveExemption = (exemptionId: string) => {
    if (disabled) return;
    
    const newSelected = value.filter(id => id !== exemptionId);
    onChange(newSelected);
  };

  const toggleRegionExpansion = (regionIndex: number) => {
    setFilteredExemptionsByRegion(prev => 
      prev.map((region, index) => 
        index === regionIndex 
          ? { ...region, isExpanded: !region.isExpanded }
          : region
      )
    );

    setExemptionsByRegion(prev => 
      prev.map(region => 
        region.region === filteredExemptionsByRegion[regionIndex]?.region
          ? { ...region, isExpanded: !region.isExpanded }
          : region
      )
    );
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        <span className="text-sm text-muted-foreground">Loading regulatory exemptions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive py-2">
        <p>Error loading regulatory exemptions: {error}</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadRegulatoryExemptions}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Multi-select popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between h-auto min-h-[2.5rem] py-2"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm">
                {value.length === 0 
                  ? "Select regulatory exemptions..." 
                  : `${value.length} exemption${value.length !== 1 ? 's' : ''} selected`
                }
              </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[700px] p-0" align="start">
          <div className="max-h-[600px] overflow-y-auto">
            <div className="p-4 border-b space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Regulatory Exemptions by Region
              </h4>
              <p className="text-xs text-muted-foreground">
                Select applicable regulatory exemptions for this project
              </p>
              
              {/* Search input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search exemptions by type or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSearch}
                    className="absolute right-1 top-1/2 h-6 w-6 p-0 -translate-y-1/2"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <div className="p-2">
              {filteredExemptionsByRegion.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? `No exemptions found matching "${searchQuery}"` : "No exemptions available"}
                </div>
              ) : (
                filteredExemptionsByRegion.map((region, regionIndex) => (
                  <Collapsible
                    key={region.region}
                    open={region.isExpanded}
                    onOpenChange={() => toggleRegionExpansion(regionIndex)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-start py-2 px-3 h-auto"
                      >
                        {region.isExpanded ? (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        <span className="font-medium">{region.region}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {region.countries.reduce((total, country) => total + country.exemptions.length, 0)}
                        </Badge>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-4">
                      {region.countries.map((country) => (
                        <div key={country.country} className="mb-3">
                          <div className="flex items-center gap-2 mb-2 py-1">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{country.country}</span>
                            <Badge variant="outline">
                              {country.exemptions.length}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 ml-6">
                            {country.exemptions.map((exemption) => (
                              <div key={exemption.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={exemption.id}
                                  checked={value.includes(exemption.id)}
                                  onCheckedChange={(checked) => 
                                    handleExemptionToggle(exemption, checked as boolean)
                                  }
                                  disabled={disabled}
                                  className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                  <label
                                    htmlFor={exemption.id}
                                    className="text-sm font-medium leading-none cursor-pointer block"
                                  >
                                    {exemption.exemptionType}
                                  </label>
                                  
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {exemption.explanation}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected exemptions display with explanations */}
      {selectedExemptions.length > 0 && (
        <Card className="mt-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Selected Regulatory Exemptions ({selectedExemptions.length})
            </CardTitle>
            <CardDescription className="text-xs">
              These regulatory exemptions will apply to this project
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {selectedExemptions.map((exemption) => {
                const regionData = exemptionsByRegion.find(r => 
                  r.countries.some(c => 
                    c.exemptions.some(e => e.id === exemption.id)
                  )
                );
                const countryData = regionData?.countries.find(c => 
                  c.exemptions.some(e => e.id === exemption.id)
                );
                
                return (
                  <div key={exemption.id} className="p-4 bg-muted/30 rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{exemption.exemptionType}</span>
                          {!disabled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveExemption(exemption.id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {countryData?.country}, {regionData?.region}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Explanation
                      </h5>
                      <p className="text-sm leading-relaxed">
                        {exemption.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RegulatoryExemptionsField;