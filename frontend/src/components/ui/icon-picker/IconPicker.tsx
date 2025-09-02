// =====================================================
// ICON PICKER COMPONENT - ENHANCED VERSION
// Enhanced icon picker with all 1500+ icons and improved navigation
// Created: August 29, 2025  
// Updated: Fixed tab overflow and expanded icon library
// =====================================================

import React, { useState, useMemo, useCallback } from 'react';
import { Search, Grid3x3, List, X, Check, Sparkles, Star, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ICON_LIBRARY,
  CATEGORY_NAMES,
  getIconByName,
  searchIcons,
  getIconsByCategory,
  getPopularIcons,
  type IconDefinition
} from './IconLibrary';

interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
  children?: React.ReactNode;
  placeholder?: string;
  showClearButton?: boolean;
}

export function IconPicker({ 
  value, 
  onChange, 
  className, 
  children,
  placeholder = "Select Icon",
  showClearButton = true
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recentIcons, setRecentIcons] = useState<string[]>([]);

  const filteredIcons = useMemo(() => {
    let icons: IconDefinition[] = [];

    if (selectedCategory === 'Popular') {
      icons = getPopularIcons();
    } else if (selectedCategory === 'Recent' && recentIcons.length > 0) {
      icons = recentIcons
        .map(name => getIconByName(name))
        .filter((icon): icon is IconDefinition => icon !== null);
    } else if (selectedCategory === 'All') {
      icons = ICON_LIBRARY;
    } else {
      icons = getIconsByCategory(selectedCategory);
    }

    if (searchQuery) {
      icons = searchIcons(searchQuery);
    }

    // Show more results given our larger library
    return searchQuery ? icons.slice(0, 200) : icons.slice(0, 150);
  }, [searchQuery, selectedCategory, recentIcons]);

  const handleIconSelect = useCallback((iconName: string) => {
    onChange(iconName);
    
    // Add to recent icons
    setRecentIcons(prev => {
      const updated = [iconName, ...prev.filter(icon => icon !== iconName)];
      return updated.slice(0, 24); // Keep last 24 recent icons
    });
    
    setOpen(false);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    setOpen(false);
  }, [onChange]);

  const currentIcon = value ? getIconByName(value) : null;

  // Get search suggestions
  const getSearchSuggestions = (query: string): string[] => {
    const suggestions = [
      'user', 'dashboard', 'settings', 'file', 'chart', 'building', 'money', 'security',
      'mail', 'phone', 'calendar', 'arrow', 'check', 'home', 'search', 'edit'
    ];
    
    return suggestions.filter(s => 
      s.toLowerCase().includes(query.toLowerCase()) && s !== query.toLowerCase()
    );
  };

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    return getSearchSuggestions(searchQuery).slice(0, 4);
  }, [searchQuery]);

  // Create category options for the select dropdown
  const categoryOptions = useMemo(() => {
    const options = [
      { value: 'Popular', label: '⭐ Popular', count: getPopularIcons().length }
    ];
    
    if (recentIcons.length > 0) {
      options.push({ value: 'Recent', label: '🕒 Recent', count: recentIcons.length });
    }
    
    CATEGORY_NAMES.forEach(category => {
      const icons = getIconsByCategory(category);
      options.push({ 
        value: category, 
        label: category, 
        count: icons.length 
      });
    });
    
    options.push({ 
      value: 'All', 
      label: '📋 All Icons', 
      count: ICON_LIBRARY.length 
    });
    
    return options;
  }, [recentIcons.length]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className={className}>
            {currentIcon ? (
              <div className="flex items-center gap-2">
                <currentIcon.component className="w-4 h-4" />
                <span className="max-w-24 truncate">{value}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Grid3x3 className="w-4 h-4" />
                <span>{placeholder}</span>
              </div>
            )}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Select Icon
          </DialogTitle>
          <DialogDescription>
            Choose from {ICON_LIBRARY.length} carefully curated Lucide React icons
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search icons... (e.g., 'user', 'chart', 'file')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* Search Suggestions */}
          {searchSuggestions.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-500">Try:</span>
              {searchSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery(suggestion)}
                  className="h-6 text-xs"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}

          {/* Enhanced Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Category Dropdown - Replaces horizontal tabs */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between w-full">
                        <span>{option.label}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Result Count */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {filteredIcons.length} icons
              </Badge>
              {searchQuery && (
                <Badge variant="outline">
                  "{searchQuery}"
                </Badge>
              )}
            </div>
          </div>

          {/* Icon Grid/List Display */}
          <div className="mt-4">
            <ScrollArea className="h-96">
              {filteredIcons.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-10 sm:grid-cols-12 lg:grid-cols-15 gap-1.5 p-1">
                    {filteredIcons.map((icon) => {
                      const isSelected = value === icon.name;
                      
                      return (
                        <Button
                          key={icon.name}
                          variant={isSelected ? 'default' : 'ghost'}
                          size="sm"
                          className="h-10 w-10 flex flex-col items-center justify-center p-1 relative hover:bg-blue-50 group"
                          onClick={() => handleIconSelect(icon.name)}
                          title={`${icon.name}\nCategory: ${icon.category}\nKeywords: ${icon.keywords.slice(0, 3).join(', ')}`}
                        >
                          <icon.component className="w-4 h-4" />
                          {isSelected && (
                            <Check className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-blue-500 text-white rounded-full p-0.5" />
                          )}
                          {/* Show name on hover for better UX */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {icon.name}
                          </div>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1 p-1">
                    {filteredIcons.map((icon) => {
                      const isSelected = value === icon.name;
                      
                      return (
                        <Button
                          key={icon.name}
                          variant={isSelected ? 'default' : 'ghost'}
                          className="w-full justify-start gap-3 text-sm h-12"
                          onClick={() => handleIconSelect(icon.name)}
                        >
                          <icon.component className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 text-left">
                            <span className="font-mono text-sm">{icon.name}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                {icon.category}
                              </span>
                              <span className="truncate max-w-48">
                                {icon.keywords.slice(0, 3).join(', ')}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 ml-auto flex-shrink-0" />}
                        </Button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-2">
                    <Search className="w-8 h-8 mx-auto" />
                  </div>
                  <p className="text-gray-500 font-medium">No icons found</p>
                  <p className="text-gray-400 text-sm">
                    Try different search terms or browse categories
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="mt-2"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Current Selection Display */}
          {currentIcon && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 text-blue-600" />
                  Selected Icon
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <currentIcon.component className="w-8 h-8 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 font-mono">{currentIcon.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {currentIcon.category}
                      </Badge>
                      <span className="text-xs text-blue-600">
                        {currentIcon.keywords.slice(0, 3).join(', ')}
                      </span>
                    </div>
                  </div>
                  {showClearButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClear}
                      className="ml-auto text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Simple Icon Display Component
interface IconDisplayProps {
  iconName: string;
  className?: string;
  fallback?: React.ReactNode;
  showTooltip?: boolean;
}

export function IconDisplay({ 
  iconName, 
  className = "w-4 h-4", 
  fallback,
  showTooltip = false
}: IconDisplayProps) {
  const iconDef = getIconByName(iconName);
  
  if (!iconDef) {
    return (fallback || <Grid3x3 className={className} />) as React.ReactElement;
  }
  
  const iconElement = <iconDef.component className={className} />;
  
  if (showTooltip) {
    return (
      <div title={`${iconDef.name} - ${iconDef.category}`} className="inline-flex">
        {iconElement}
      </div>
    );
  }
  
  return iconElement;
}

// Icon Button Component
interface IconButtonProps {
  iconName: string;
  label?: string;
  onClick?: () => void;
  className?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'md' | 'lg';
  showIconName?: boolean;
}

export function IconButton({ 
  iconName, 
  label, 
  onClick, 
  className,
  variant = 'ghost',
  size = 'md',
  showIconName = false
}: IconButtonProps) {
  const iconDef = getIconByName(iconName);
  
  const sizeClasses = {
    sm: 'gap-1 text-sm',
    md: 'gap-2',
    lg: 'gap-3 text-lg'
  };
  
  return (
    <Button 
      variant={variant} 
      onClick={onClick} 
      className={`${sizeClasses[size]} ${className}`}
      title={iconDef ? `${iconDef.name} - ${iconDef.category}` : iconName}
    >
      {iconDef ? (
        <iconDef.component className="w-4 h-4" />
      ) : (
        <Grid3x3 className="w-4 h-4" />
      )}
      {label && <span>{label}</span>}
      {showIconName && !label && (
        <span className="font-mono text-xs">{iconName}</span>
      )}
    </Button>
  );
}

// Icon Preview Grid
interface IconPreviewGridProps {
  icons: string[];
  onIconSelect?: (iconName: string) => void;
  selectedIcon?: string;
  className?: string;
  showTooltips?: boolean;
}

export function IconPreviewGrid({ 
  icons, 
  onIconSelect, 
  selectedIcon,
  className = "grid-cols-8",
  showTooltips = true
}: IconPreviewGridProps) {
  return (
    <div className={`grid gap-2 ${className}`}>
      {icons.map((iconName) => {
        const iconDef = getIconByName(iconName);
        if (!iconDef) return null;
        
        const isSelected = selectedIcon === iconName;
        
        return (
          <Button
            key={iconName}
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            className="h-12 w-12 flex flex-col items-center justify-center p-1 relative group"
            onClick={() => onIconSelect?.(iconName)}
            title={showTooltips ? `${iconDef.name} - ${iconDef.category}` : undefined}
          >
            <iconDef.component className="w-5 h-5" />
            {isSelected && (
              <Check className="absolute top-1 right-1 w-3 h-3" />
            )}
            {showTooltips && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {iconDef.name}
              </div>
            )}
          </Button>
        );
      })}
    </div>
  );
}

// Quick Icon Search Hook for external use
export function useIconSearch() {
  const [query, setQuery] = useState('');
  
  const results = useMemo(() => {
    return query ? searchIcons(query).slice(0, 20) : getPopularIcons();
  }, [query]);
  
  return {
    query,
    setQuery,
    results
  };
}
