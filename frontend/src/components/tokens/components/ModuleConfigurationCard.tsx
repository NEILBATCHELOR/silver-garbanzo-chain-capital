import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { 
  ExtensionModulesSection,
  type ExtensionModuleConfigs 
} from './ExtensionModulesSection';

interface ModuleConfigurationCardProps {
  tokenId: string;
  tokenStandard: string;
  moduleConfigs: ExtensionModuleConfigs;
  onModuleConfigsChange: <K extends keyof ExtensionModuleConfigs>(
    moduleKey: K,
    config: ExtensionModuleConfigs[K]
  ) => void;
  disabled?: boolean;
}

/**
 * Module Configuration Card
 * 
 * Handles extension module configuration for token deployment.
 * Wraps the ExtensionModulesSection component with proper card styling.
 * 
 * @component
 */
export const ModuleConfigurationCard: React.FC<ModuleConfigurationCardProps> = React.memo(({
  tokenId,
  tokenStandard,
  moduleConfigs,
  onModuleConfigsChange,
  disabled = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Extension Modules
        </CardTitle>
        <CardDescription>
          Configure optional extension modules for your token
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ExtensionModulesSection
          tokenStandard={tokenStandard}
          configs={moduleConfigs}
          onConfigChange={onModuleConfigsChange}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
});

ModuleConfigurationCard.displayName = 'ModuleConfigurationCard';
