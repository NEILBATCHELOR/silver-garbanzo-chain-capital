import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { mapboxGeocodingService } from '../../utils/mapbox-geocoding-service';
import { GeolocationDetails } from '../../types';

interface AddressLookupProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange: (address: string, geolocationDetails: GeolocationDetails | null) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  showCoordinates?: boolean;
  allowManualEntry?: boolean;
}

// Simple debounce hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const AddressLookup: React.FC<AddressLookupProps> = ({
  label = "Location",
  placeholder = "Enter an address to search...",
  value = "",
  onChange,
  disabled = false,
  required = false,
  className = "",
  showCoordinates = true,
  allowManualEntry = true
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GeolocationDetails[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedGeolocation, setSelectedGeolocation] = useState<GeolocationDetails | null>(null);
  const [error, setError] = useState<string>('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Debounce search input to avoid excessive API calls
  const debouncedSearchValue = useDebounce(inputValue, 500);

  // Handle input value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Search for address suggestions when debounced value changes
  useEffect(() => {
    if (debouncedSearchValue && debouncedSearchValue.length >= 3) {
      searchAddresses(debouncedSearchValue);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearchValue]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const searchAddresses = useCallback(async (query: string) => {
    if (!mapboxGeocodingService.isConfigured()) {
      setError('Mapbox geocoding is not configured');
      return;
    }

    setIsSearching(true);
    setError('');

    try {
      const results = await mapboxGeocodingService.searchAddresses(query, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (error) {
      console.error('Address search failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to search addresses');
      setSuggestions([]);
      setShowSuggestions(false);
      
      if (error instanceof Error && error.message.includes('not configured')) {
        toast({
          title: "Configuration Error",
          description: "Address lookup is not properly configured. Please contact support.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setInputValue(newValue);
    setError('');
    
    // Clear selected geolocation if user is typing a new address
    if (selectedGeolocation && newValue !== selectedGeolocation.formatted_address) {
      setSelectedGeolocation(null);
    }

    // If manual entry is allowed and no geocoding is needed
    if (allowManualEntry && newValue.length > 0) {
      onChange(newValue, null);
    }
  };

  const handleSuggestionSelect = (suggestion: GeolocationDetails) => {
    setInputValue(suggestion.formatted_address);
    setSelectedGeolocation(suggestion);
    setShowSuggestions(false);
    setError('');
    onChange(suggestion.formatted_address, suggestion);
  };

  const handleManualGeocoding = async () => {
    if (!inputValue.trim()) return;

    setIsSearching(true);
    setError('');

    try {
      const result = await mapboxGeocodingService.geocodeAddress(inputValue.trim());
      if (result) {
        setSelectedGeolocation(result);
        setInputValue(result.formatted_address);
        onChange(result.formatted_address, result);
        toast({
          title: "Address Found",
          description: "Location has been geocoded successfully",
          variant: "default",
        });
      } else {
        setError('No results found for this address');
        toast({
          title: "No Results",
          description: "Could not find location information for this address",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
      setError(errorMessage);
      toast({
        title: "Geocoding Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (suggestions.length > 0) {
        handleSuggestionSelect(suggestions[0]);
      } else if (allowManualEntry && inputValue.trim()) {
        handleManualGeocoding();
      }
    } else if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="address-lookup" className="text-sm font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            id="address-lookup"
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className={`pr-12 ${error ? 'border-red-500' : selectedGeolocation ? 'border-green-500' : ''}`}
          />
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
            {isSearching && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            
            {selectedGeolocation && !isSearching && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            
            {error && !isSearching && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            
            {allowManualEntry && !isSearching && !selectedGeolocation && inputValue.trim() && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleManualGeocoding}
                title="Geocode this address"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <Card 
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-auto shadow-lg border"
          >
            <CardContent className="p-0">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.place_id}-${index}`}
                  className="px-3 py-2 cursor-pointer hover:bg-muted border-b last:border-b-0 flex items-start space-x-2"
                  onClick={() => handleSuggestionSelect(suggestion)}
                >
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {suggestion.formatted_address}
                    </div>
                    {suggestion.place_type && suggestion.place_type.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {suggestion.place_type.slice(0, 2).map((type) => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </p>
      )}

      {/* Selected location details */}
      {selectedGeolocation && showCoordinates && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3 w-3" />
            <span>
              Coordinates: {selectedGeolocation.coordinates.latitude.toFixed(6)}, {selectedGeolocation.coordinates.longitude.toFixed(6)}
            </span>
          </div>
          {selectedGeolocation.country && (
            <div className="pl-5">
              Country: {selectedGeolocation.country}
              {selectedGeolocation.region && `, ${selectedGeolocation.region}`}
            </div>
          )}
        </div>
      )}

      {/* Service status warning */}
      {!mapboxGeocodingService.isConfigured() && (
        <p className="text-sm text-amber-600 flex items-center space-x-1">
          <AlertCircle className="h-3 w-3" />
          <span>Address lookup is not configured. Manual entry only.</span>
        </p>
      )}
    </div>
  );
};

export default AddressLookup;
