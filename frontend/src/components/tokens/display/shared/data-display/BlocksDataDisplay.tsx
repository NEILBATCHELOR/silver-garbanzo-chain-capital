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
  Settings,
  Info,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Code,
  Hash,
  Eye,
  EyeOff
} from 'lucide-react';

interface BlocksDataDisplayProps {
  blocks: Record<string, any>;
  title?: string;
  className?: string;
  compact?: boolean;
  maxInitialItems?: number;
}

const BlocksDataDisplay: React.FC<BlocksDataDisplayProps> = ({
  blocks,
  title = "Token Configuration",
  className = "",
  compact = false,
  maxInitialItems = 6
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [showAllItems, setShowAllItems] = useState(false);

  if (!blocks || Object.keys(blocks).length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No configuration blocks available</p>
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
    if (typeof value === 'boolean') {
      return value ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (typeof value === 'object' && value !== null) {
      return <Code className="h-4 w-4 text-blue-500" />;
    }
    if (typeof value === 'number') {
      return <Hash className="h-4 w-4 text-purple-500" />;
    }
    return <Info className="h-4 w-4 text-gray-500" />;
  };

  // Get badge variant for different value types
  const getBadgeVariant = (value: any): "default" | "secondary" | "destructive" | "outline" => {
    if (typeof value === 'boolean') {
      return value ? "default" : "secondary";
    }
    if (typeof value === 'object' && value !== null) {
      return "outline";
    }
    return "secondary";
  };

  // Format value for display
  const formatValue = (value: any): string => {
    if (typeof value === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return `Array (${value.length} items)`;
      }
      return `Object (${Object.keys(value).length} properties)`;
    }
    if (typeof value === 'string' && value.length > 50) {
      return `${value.substring(0, 47)}...`;
    }
    return String(value);
  };

  // Toggle section expansion
  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Render complex object details
  const renderComplexValue = (value: any, depth = 0) => {
    if (depth > 2) return <span className="text-muted-foreground">...</span>;

    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground">
            Array ({value.length} items):
          </div>
          <div className="space-y-1 ml-4">
            {value.slice(0, 5).map((item, index) => (
              <div key={index} className="text-sm">
                <span className="font-mono text-xs text-muted-foreground mr-2">[{index}]</span>
                {typeof item === 'object' ? (
                  <Badge variant="outline" className="text-xs">
                    {Array.isArray(item) ? `Array (${item.length})` : `Object (${Object.keys(item).length})`}
                  </Badge>
                ) : (
                  <span>{String(item)}</span>
                )}
              </div>
            ))}
            {value.length > 5 && (
              <div className="text-xs text-muted-foreground">
                ... and {value.length - 5} more items
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
          <div className="space-y-1 ml-4">
            {Object.entries(value).slice(0, 5).map(([key, val]) => (
              <div key={key} className="text-sm">
                <span className="font-medium text-muted-foreground mr-2">{formatFieldName(key)}:</span>
                {typeof val === 'object' ? (
                  <Badge variant="outline" className="text-xs">
                    {Array.isArray(val) ? `Array (${val.length})` : `Object`}
                  </Badge>
                ) : (
                  <span>{formatValue(val)}</span>
                )}
              </div>
            ))}
            {Object.keys(value).length > 5 && (
              <div className="text-xs text-muted-foreground">
                ... and {Object.keys(value).length - 5} more properties
              </div>
            )}
          </div>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  const blockEntries = Object.entries(blocks);
  const visibleEntries = showAllItems ? blockEntries : blockEntries.slice(0, maxInitialItems);
  const hasMoreItems = blockEntries.length > maxInitialItems;

  return (
    <Card className={className}>
      <CardHeader className={compact ? 'py-4' : 'py-6'}>
        <CardTitle className={`${compact ? 'text-base' : 'text-lg'} flex items-center gap-2`}>
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          {title}
          <Badge variant="secondary" className="ml-auto">
            {blockEntries.length} config{blockEntries.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
          {visibleEntries.map(([key, value], index) => (
            <div key={key} className="space-y-2">
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
                      <p className="max-w-xs">Configuration field: {key}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

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
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(value)} className="text-xs">
                      {formatValue(value)}
                    </Badge>
                  </div>
                )}
              </div>

              {index < visibleEntries.length - 1 && (
                <Separator className="my-2 opacity-50" />
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
                  Show {blockEntries.length - maxInitialItems} More
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlocksDataDisplay;