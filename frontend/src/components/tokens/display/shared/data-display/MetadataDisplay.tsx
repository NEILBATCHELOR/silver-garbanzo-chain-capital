import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  ChevronDown,
  ChevronUp,
  Database,
  Info,
  FileText,
  Image,
  Link,
  Hash,
  Type,
  List,
  Eye,
  EyeOff,
  ExternalLink,
  Copy
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MetadataDisplayProps {
  metadata: Record<string, any>;
  title?: string;
  className?: string;
  compact?: boolean;
  maxInitialItems?: number;
}

const MetadataDisplay: React.FC<MetadataDisplayProps> = ({
  metadata,
  title = "Token Metadata",
  className = "",
  compact = false,
  maxInitialItems = 8
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showAllItems, setShowAllItems] = useState(false);
  const { toast } = useToast();

  if (!metadata || Object.keys(metadata).length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No metadata available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format field names for display
  const formatFieldName = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  };

  // Get icon for different value types
  const getValueIcon = (value: any) => {
    if (Array.isArray(value)) {
      return <List className="h-4 w-4 text-blue-500" />;
    }
    if (typeof value === 'object' && value !== null) {
      return <FileText className="h-4 w-4 text-purple-500" />;
    }
    if (typeof value === 'string' && value.startsWith('http')) {
      return <Link className="h-4 w-4 text-green-500" />;
    }
    if (typeof value === 'string' && (value.includes('.jpg') || value.includes('.png') || value.includes('.gif') || value.includes('.svg'))) {
      return <Image className="h-4 w-4 text-orange-500" />;
    }
    if (typeof value === 'number') {
      return <Hash className="h-4 w-4 text-cyan-500" />;
    }
    return <Type className="h-4 w-4 text-gray-500" />;
  };

  // Get badge variant for different value types
  const getBadgeVariant = (value: any): "default" | "secondary" | "destructive" | "outline" => {
    if (Array.isArray(value)) {
      return "default";
    }
    if (typeof value === 'object' && value !== null) {
      return "outline";
    }
    if (typeof value === 'string' && value.startsWith('http')) {
      return "secondary";
    }
    return "secondary";
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return `${value.length} item${value.length !== 1 ? 's' : ''}`;
    }
    if (typeof value === 'object' && value !== null) {
      return `Object (${Object.keys(value).length} properties)`;
    }
    if (typeof value === 'string' && value.length > 60) {
      return `${value.substring(0, 57)}...`;
    }
    return String(value);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Value copied successfully",
        variant: "default"
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Toggle section expansion
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Check if value is a URL
  const isUrl = (value: any): boolean => {
    return typeof value === 'string' && value.startsWith('http');
  };

  // Render complex value details
  const renderComplexValue = (value: any, depth = 0) => {
    if (depth > 2) return <span className="text-muted-foreground">...</span>;

    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Array ({value.length} items):
          </div>
          <div className="space-y-2 ml-4">
            {value.slice(0, 10).map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs text-muted-foreground min-w-[24px]">[{index}]</span>
                {typeof item === 'object' ? (
                  <Badge variant="outline" className="text-xs">
                    {Array.isArray(item) ? `Array (${item.length})` : `Object (${Object.keys(item).length})`}
                  </Badge>
                ) : isUrl(item) ? (
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">URL</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 text-xs"
                      onClick={() => window.open(item, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="break-all">{String(item)}</span>
                )}
              </div>
            ))}
            {value.length > 10 && (
              <div className="text-xs text-muted-foreground ml-6">
                ... and {value.length - 10} more items
              </div>
            )}
          </div>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Object ({Object.keys(value).length} properties):
          </div>
          <div className="space-y-2 ml-4">
            {Object.entries(value).slice(0, 8).map(([key, val]) => (
              <div key={key} className="flex items-start gap-2 text-sm">
                <span className="font-medium text-muted-foreground min-w-fit">{formatFieldName(key)}:</span>
                <div className="flex-1">
                  {typeof val === 'object' ? (
                    <Badge variant="outline" className="text-xs">
                      {Array.isArray(val) ? `Array (${val.length})` : `Object`}
                    </Badge>
                  ) : isUrl(val) ? (
                    <div className="flex items-center gap-1">
                      <span className="break-all text-xs">{String(val)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 px-1"
                        onClick={() => window.open(String(val), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="break-all">{formatValue(val)}</span>
                  )}
                </div>
              </div>
            ))}
            {Object.keys(value).length > 8 && (
              <div className="text-xs text-muted-foreground ml-6">
                ... and {Object.keys(value).length - 8} more properties
              </div>
            )}
          </div>
        </div>
      );
    }

    return <span className="break-all">{String(value)}</span>;
  };

  const metadataEntries = Object.entries(metadata);
  const visibleEntries = showAllItems ? metadataEntries : metadataEntries.slice(0, maxInitialItems);
  const hasMoreItems = metadataEntries.length > maxInitialItems;

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'py-4' : 'py-6'}>
        <CardTitle className={`${compact ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          {title}
          <Badge variant="secondary" className="ml-auto">
            {metadataEntries.length} field{metadataEntries.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {visibleEntries.map(([key, value], index) => (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        {getValueIcon(value)}
                        <span className={`${compact ? 'text-sm' : 'text-base'} font-medium`}>
                          {formatFieldName(key)}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Metadata field: {key}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <div className="flex items-center gap-1">
                  {(typeof value === 'string' && value.length > 20) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(String(value))}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {(typeof value === 'object' && value !== null) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(key)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedSections[key] ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {typeof value === 'object' && value !== null ? (
                  <Collapsible
                    open={expandedSections[key]}
                    onOpenChange={() => toggleSection(key)}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(value)} className="text-xs">
                        {formatValue(value)}
                      </Badge>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          {expandedSections[key] ? 'Hide details' : 'Show details'}
                          {expandedSections[key] ? (
                            <ChevronUp className="h-3 w-3 ml-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 ml-1" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="space-y-2">
                      <div className="bg-muted p-3 rounded border">
                        {renderComplexValue(value)}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : isUrl(value) ? (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">URL</Badge>
                    <span className="text-sm break-all flex-1">{formatValue(value)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(String(value), '_blank')}
                      className="h-6 px-2"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(value)} className="text-xs">
                      {typeof value === 'string' ? 'Text' : typeof value}
                    </Badge>
                    <span className={`${compact ? 'text-sm' : 'text-base'} break-all flex-1`}>
                      {formatValue(value)}
                    </span>
                  </div>
                )}
              </div>

              {index < visibleEntries.length - 1 && (
                <Separator className="my-3 opacity-50" />
              )}
            </div>
          ))}
        </div>

        {hasMoreItems && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllItems(!showAllItems)}
              className="text-xs"
            >
              {showAllItems ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show {metadataEntries.length - maxInitialItems} More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetadataDisplay;