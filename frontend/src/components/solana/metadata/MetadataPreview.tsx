/**
 * Metadata Preview Component
 * 
 * Shows generated metadata, size analysis, and validation results
 * Provides optimization suggestions if metadata exceeds size limits
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  Database,
  FileText
} from 'lucide-react';
import type { OnChainMetadataResult } from '@/services/tokens/metadata';

interface MetadataPreviewProps {
  metadata: OnChainMetadataResult | null;
}

export function MetadataPreview({ metadata }: MetadataPreviewProps) {
  if (!metadata) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Complete the form to see metadata preview
        </AlertDescription>
      </Alert>
    );
  }

  const { validation } = metadata;
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  // Convert Map to array for display
  const metadataArray = Array.from(metadata.additionalMetadata.entries());

  return (
    <div className="space-y-4">
      {/* Validation Status */}
      <Alert variant={hasErrors ? 'destructive' : hasWarnings ? 'default' : 'default'}>
        {hasErrors ? (
          <AlertCircle className="h-4 w-4" />
        ) : hasWarnings ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <AlertTitle>
          {hasErrors 
            ? 'Validation Failed' 
            : hasWarnings 
              ? 'Warnings Present' 
              : 'Validation Passed'}
        </AlertTitle>
        <AlertDescription>
          {hasErrors && (
            <div className="mt-2 space-y-1">
              {validation.errors.map((error, idx) => (
                <div key={idx} className="text-sm">• {error}</div>
              ))}
            </div>
          )}
          {hasWarnings && (
            <div className="mt-2 space-y-1">
              {validation.warnings.map((warning, idx) => (
                <div key={idx} className="text-sm">• {warning}</div>
              ))}
            </div>
          )}
          {!hasErrors && !hasWarnings && (
            <div className="text-sm">
              Metadata is valid and ready for deployment
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Size Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Size Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Total Size</span>
            <Badge variant={validation.estimatedSize > 1024 ? 'destructive' : 'secondary'}>
              {validation.estimatedSize} bytes
            </Badge>
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block text-muted-foreground">
                  Target: 1024 bytes
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block">
                  {((validation.estimatedSize / 1024) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 text-xs flex rounded bg-secondary">
              <div
                style={{ width: `${Math.min((validation.estimatedSize / 1024) * 100, 100)}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  validation.estimatedSize > 1024 
                    ? 'bg-destructive' 
                    : validation.estimatedSize > 900 
                      ? 'bg-yellow-500' 
                      : 'bg-primary'
                }`}
              ></div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Standard Fields</span>
              <span className="text-muted-foreground">
                {new TextEncoder().encode(metadata.name).length + 
                 new TextEncoder().encode(metadata.symbol).length + 
                 new TextEncoder().encode(metadata.uri).length} bytes
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Additional Fields</span>
              <span className="text-muted-foreground">
                {validation.estimatedSize} bytes
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Field Count</span>
              <span className="text-muted-foreground">
                {metadataArray.length} fields
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Fields Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Standard Fields
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="font-medium">Name:</div>
            <div className="col-span-2 break-all">{metadata.name}</div>
            
            <div className="font-medium">Symbol:</div>
            <div className="col-span-2">{metadata.symbol}</div>
            
            <div className="font-medium">URI:</div>
            <div className="col-span-2 break-all text-muted-foreground text-xs">
              {metadata.uri}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Metadata Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Metadata Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {metadataArray.map(([key, value], idx) => (
              <div key={idx} className="grid grid-cols-3 gap-2 text-sm py-1 border-b border-border last:border-0">
                <div className="font-medium truncate">{key}</div>
                <div className="col-span-2 break-all text-muted-foreground">{value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* JSON Preview (for copying) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">JSON Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-secondary p-4 rounded-md overflow-x-auto">
            {JSON.stringify(
              {
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
                additionalMetadata: Object.fromEntries(metadata.additionalMetadata)
              },
              null,
              2
            )}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
