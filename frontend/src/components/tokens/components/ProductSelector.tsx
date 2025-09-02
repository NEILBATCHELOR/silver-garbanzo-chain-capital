import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, FileText, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from '@/components/ui/use-toast';

import { TokenStandard } from '@/types/core/centralModels';
import { 
  discoverExampleFiles, 
  loadExampleFile, 
  getAssetTypes, 
  getCategories,
  type ExampleFileItem 
} from '../services/exampleFileService';

// Types
export interface FileSelectionResult {
  content: string;
  tokenStandard: TokenStandard;
  configMode: 'min' | 'max';
}

interface ProductSelectorProps {
  onFileSelect: (result: FileSelectionResult) => void;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ onFileSelect }) => {
  const [files, setFiles] = useState<ExampleFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Filter states
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'primary' | 'alternative'>('all');
  const [tokenStandardFilter, setTokenStandardFilter] = useState<string>('all');

  // Load files on component mount and set up auto-refresh
  useEffect(() => {
    loadFiles();
    
    // Set up auto-refresh every 60 seconds
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        loadFiles();
      }, 60000); // 60 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh]);

  // Load the file list by discovering example files
  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const discoveredFiles = await discoverExampleFiles();
      setFiles(discoveredFiles);
      setLastRefresh(new Date());
      
      console.log(`Discovered ${discoveredFiles.length} example files`);
      
      // Only show toast if we found files and this isn't the initial load
      if (discoveredFiles.length > 0 && files.length > 0) {
        toast({
          title: "File list refreshed",
          description: `Found ${discoveredFiles.length} example files`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error discovering files:', error);
      toast({
        title: "Error refreshing files",
        description: "Could not refresh file list",
        variant: "destructive",
        duration: 3000
      });
    } finally {
      setIsLoading(false);
    }
  }, [files.length]);

  // Handle file selection
  const handleFileSelect = async (file: ExampleFileItem) => {
    setSelectedFile(file.path);
    
    try {
      // Load the JSON file content
      const content = await loadExampleFile(file.path);
      
      // Determine config mode (always max for examples)
      const configMode = 'max';
      
      // Notify parent component of selection
      onFileSelect({
        content,
        tokenStandard: file.tokenStandard,
        configMode
      });
      
      toast({
        title: "Example loaded",
        description: `Loaded ${file.displayName}`,
        duration: 2000
      });
    } catch (error) {
      console.error(`Error loading file ${file.path}:`, error);
      
      toast({
        title: "Error loading example",
        description: `Unable to load ${file.displayName}. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
        duration: 5000
      });
    }
  };

  // Filter the file list based on search term and selected filters
  const filteredFiles = files.filter(file => {
    // Text search filter
    const matchesSearch = !searchTerm || 
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.assetType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.tokenStandard.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Asset type filter - enhanced logic to handle special characters and formats
    const matchesAssetType = assetTypeFilter === 'all' || (() => {
      // For standard "Main / Sub" format, convert to internal format
      if (assetTypeFilter.includes(' / ')) {
        const [mainType, subType] = assetTypeFilter.split(' / ');
        
        // Create reverse mapping from display names to internal format
        const displayToInternal = {
          // Main categories
          'Alternative Assets': 'alternative-assets',
          'Digital Assets': 'digital-assets',
          'Stablecoins': 'stablecoins',
          'Traditional Assets': 'traditional-assets',
          
          // Subcategories with special characters
          'Asset Backed Receivables': 'asset-backed-receivables',
          'Carbon Credits': 'carbon-credits',
          'Collectibles & Other Assets': 'collectibles-other',
          'Energy': 'energy',
          'Infrastructure': 'infrastructure',
          'Private Debt': 'private-debt',
          'Private Equity': 'private-equity',
          'Real Estate': 'real-estate',
          'Solar & Wind Energy, Climate Receivables': 'solar-wind-energy-climate-receivables',
          'Digital Tokenised Fund': 'digital-tokenised-fund',
          'Algorithmic Stablecoins': 'algorithmic',
          'Commodity-Backed Stablecoins': 'commodity-backed',
          'Crypto-Backed Stablecoins': 'crypto-backed',
          'Fiat-Backed Stablecoins': 'fiat-backed',
          'Bonds': 'bonds',
          'Commodities': 'commodities',
          'Equity': 'equity',
          'Funds, ETFs, ETPs': 'funds-etfs-etps',
          'Quantitative Strategies': 'quantitative-strategies',
          'Structured Products': 'structured-products'
        };
        
        const mainInternal = displayToInternal[mainType] || mainType.toLowerCase().replace(/\s+/g, '-');
        const subInternal = displayToInternal[subType] || subType.toLowerCase().replace(/\s+/g, '-');
        const expectedFormat = `${mainInternal}/${subInternal}`;
        
        return file.assetType === expectedFormat;
      }
      
      // Fallback to partial matching for other cases
      return file.assetType.includes(assetTypeFilter.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    })();
    
    // Category filter
    const matchesCategory = categoryFilter === 'all' || file.category === categoryFilter;
    
    // Token standard filter
    const matchesTokenStandard = tokenStandardFilter === 'all' || file.tokenStandard === tokenStandardFilter;
    
    return matchesSearch && matchesAssetType && matchesCategory && matchesTokenStandard;
  });

  // Get unique token standards from files for filter
  const availableTokenStandards = Array.from(new Set(files.map(f => f.tokenStandard)));

  // Render a file item
  const renderFileItem = (file: ExampleFileItem) => {
    const isSelected = file.path === selectedFile;
    
    // Token standard badge
    const tokenBadge = (
      <Badge variant="outline" className="ml-1 text-xs">
        {file.tokenStandard}
      </Badge>
    );
    
    // Category badge
    const categoryBadge = (
      <Badge variant={file.category === 'primary' ? 'default' : 'secondary'} className="ml-1 text-xs">
        {file.category}
      </Badge>
    );
    
    return (
      <div 
        key={file.path}
        className={`flex items-center justify-between rounded-md px-3 py-2 my-1 cursor-pointer hover:bg-gray-100 ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''}`}
        onClick={() => handleFileSelect(file)}
      >
        <div className="flex items-center flex-1 min-w-0">
          <FileText className="h-4 w-4 mr-2 text-gray-500 flex-shrink-0" />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-medium truncate">{file.displayName}</span>
            <span className="text-xs text-gray-500 truncate">{file.name}</span>
          </div>
        </div>
        <div className="flex items-center flex-shrink-0 ml-2">
          {tokenBadge}
          {categoryBadge}
        </div>
      </div>
    );
  };

  // Format last refresh time
  const formatLastRefresh = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Example Token Configurations</CardTitle>
          <CardDescription>
            Browse and select from {files.length} real-world token examples
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last: {formatLastRefresh(lastRefresh)}</span>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={loadFiles}
            disabled={isLoading}
            title="Refresh file list"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Auto-refresh toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="auto-refresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="auto-refresh" className="text-sm">
                Auto-refresh every 60 seconds
              </Label>
            </div>
            <div className="text-xs text-muted-foreground">
              {filteredFiles.length} of {files.length} files shown
            </div>
          </div>
          
          {/* Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1">
              <Label htmlFor="search">Search Examples</Label>
              <Input
                id="search"
                placeholder="Search by name or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="col-span-1">
              <Label htmlFor="asset-type-filter">Asset Type</Label>
              <Select value={assetTypeFilter} onValueChange={setAssetTypeFilter}>
                <SelectTrigger id="asset-type-filter" className="mt-1">
                  <SelectValue placeholder="All Asset Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Asset Types</SelectItem>
                  {getAssetTypes().map(assetType => (
                    <SelectItem key={assetType} value={assetType}>{assetType}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label htmlFor="category-filter">Category</Label>
              <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
                <SelectTrigger id="category-filter" className="mt-1">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="primary">Primary</SelectItem>
                  <SelectItem value="alternative">Alternative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-1">
              <Label htmlFor="token-standard-filter">Token Standard</Label>
              <Select value={tokenStandardFilter} onValueChange={setTokenStandardFilter}>
                <SelectTrigger id="token-standard-filter" className="mt-1">
                  <SelectValue placeholder="All Standards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Standards</SelectItem>
                  {availableTokenStandards.map(standard => (
                    <SelectItem key={standard} value={standard}>{standard}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Display active filters */}
          <div className="flex flex-wrap gap-2">
            {assetTypeFilter !== 'all' && (
              <Badge variant="outline" className="px-2 py-1">
                Asset: {assetTypeFilter}
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="outline" className="px-2 py-1">
                Category: {categoryFilter}
              </Badge>
            )}
            {tokenStandardFilter !== 'all' && (
              <Badge variant="outline" className="px-2 py-1">
                Standard: {tokenStandardFilter}
              </Badge>
            )}
          </div>
          
          {/* File listing */}
          <div className="border rounded-md">
            <ScrollArea className="h-80">
              {isLoading ? (
                <div className="flex items-center justify-center h-full p-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">Discovering examples...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex items-center justify-center h-full p-4 text-gray-500">
                  {files.length === 0 ? 
                    "No example files found. Click refresh to scan for files." : 
                    "No examples match the current filters."}
                </div>
              ) : (
                <div className="p-2">
                  {filteredFiles.map(file => renderFileItem(file))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductSelector;