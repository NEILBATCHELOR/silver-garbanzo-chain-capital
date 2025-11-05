/**
 * Controller Module Configuration Component
 * Allows designated controllers to force transfers for ERC1400
 */

import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Plus, X } from 'lucide-react';
import type { ModuleConfigProps, ControllerModuleConfig } from '../types';

export function ControllerModuleConfigPanel({
  config,
  onChange,
  disabled = false
}: ModuleConfigProps<ControllerModuleConfig>) {

  const [newController, setNewController] = useState('');

  const handleToggle = (checked: boolean) => {
    onChange({
      enabled: checked,
      controllers: checked ? config.controllers || [] : []
    });
  };

  const addController = () => {
    if (newController.trim() && !config.controllers.includes(newController.trim())) {
      onChange({
        ...config,
        controllers: [...config.controllers, newController.trim()]
      });
      setNewController('');
    }
  };

  const removeController = (controller: string) => {
    onChange({
      ...config,
      controllers: config.controllers.filter(c => c !== controller)
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Controller Module</Label>
        <Switch
          checked={config.enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      {config.enabled && (
        <>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Allow designated controllers to force transfers. Required for regulatory seizure, 
              lost key recovery, or corporate actions.
            </AlertDescription>
          </Alert>

          <div className="p-4 border rounded-lg space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Controller Addresses</Label>
              <div className="flex gap-2">
                <Input
                  value={newController}
                  onChange={(e) => setNewController(e.target.value)}
                  placeholder="0x..."
                  disabled={disabled}
                  onKeyPress={(e) => e.key === 'Enter' && addController()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addController}
                  disabled={disabled || !newController.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* List of Controllers */}
              {config.controllers.length > 0 && (
                <div className="space-y-2 mt-2">
                  {config.controllers.map(controller => (
                    <div key={controller} className="flex items-center justify-between bg-secondary px-3 py-2 rounded">
                      <span className="text-xs font-mono">{controller}</span>
                      <button
                        type="button"
                        onClick={() => removeController(controller)}
                        disabled={disabled}
                        className="hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Addresses with controller privileges (forced transfer capability)
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
