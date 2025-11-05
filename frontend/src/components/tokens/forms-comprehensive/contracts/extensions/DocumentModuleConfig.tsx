/**
 * Document Module Configuration Component
 * Handles on-chain document management
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ModuleConfigProps, DocumentModuleConfig } from '../types';

export function DocumentModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<DocumentModuleConfig>) {

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Document Module</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Document module enabled. Upload and manage legal documents, disclosures, and terms 
            after deployment through the document management panel.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
