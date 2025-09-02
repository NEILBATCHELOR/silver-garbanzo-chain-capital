// Visual Form Designer for Token Forms
// WYSIWYG editor for designing token forms visually

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  EyeOpenIcon,
  CodeIcon,
  GearIcon,
  ResetIcon,
  DownloadIcon,
  Share1Icon
} from '@radix-ui/react-icons';
import { TokenStandard } from '@/types/core/centralModels';
import { FieldDefinition, FormSection } from './DragAndDropFormBuilder';

export interface VisualFormDesignerProps {
  standard: TokenStandard;
  sections: FormSection[];
  onSectionsChange: (sections: FormSection[]) => void;
  formData?: any;
  onFormDataChange?: (data: any) => void;
}

export const VisualFormDesigner: React.FC<VisualFormDesignerProps> = ({
  standard,
  sections,
  onSectionsChange,
  formData = {},
  onFormDataChange
}) => {
  const [previewMode, setPreviewMode] = useState<'design' | 'preview' | 'code'>('design');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [formSettings, setFormSettings] = useState({
    theme: 'default',
    layout: 'single-column',
    showProgress: true,
    allowSave: true,
    autoSave: false
  });

  // Render a form field based on its definition
  const renderFormField = useCallback((field: FieldDefinition, sectionId: string) => {
    const fieldValue = formData[field.name] || field.defaultValue || '';
    const isSelected = selectedField === field.id;

    const handleFieldChange = (value: any) => {
      if (onFormDataChange) {
        onFormDataChange({
          ...formData,
          [field.name]: value
        });
      }
    };

    const fieldComponent = (() => {
      switch (field.type) {
        case 'text':
          return (
            <Input
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
        
        case 'number':
          return (
            <Input
              type="number"
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              min={field.validation?.min}
              max={field.validation?.max}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
        
        case 'boolean':
          return (
            <div className="flex items-center space-x-2">
              <Switch
                checked={fieldValue}
                onCheckedChange={handleFieldChange}
                className={isSelected ? 'ring-2 ring-primary' : ''}
              />
              <Label>{field.label}</Label>
            </div>
          );
        
        case 'select':
          return (
            <Select value={fieldValue} onValueChange={handleFieldChange}>
              <SelectTrigger className={isSelected ? 'ring-2 ring-primary' : ''}>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        
        case 'textarea':
          return (
            <Textarea
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
        
        case 'date':
          return (
            <Input
              type="date"
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
        
        case 'address':
          return (
            <Input
              placeholder="0x..."
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
        
        default:
          return (
            <Input
              placeholder={field.placeholder}
              value={fieldValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              className={isSelected ? 'ring-2 ring-primary' : ''}
            />
          );
      }
    })();

    return (
      <div
        key={field.id}
        className={`space-y-2 p-2 rounded ${
          isSelected ? 'bg-primary/5 border border-primary' : 'hover:bg-muted/30'
        }`}
        onClick={() => setSelectedField(field.id)}
      >
        {field.type !== 'boolean' && (
          <Label className="flex items-center gap-1">
            {field.label}
            {field.required && <span className="text-destructive">*</span>}
          </Label>
        )}
        
        {fieldComponent}
        
        {field.description && (
          <p className="text-xs text-muted-foreground">{field.description}</p>
        )}
      </div>
    );
  }, [formData, selectedField, onFormDataChange]);

  // Render the form preview
  const renderFormPreview = useCallback(() => {
    return (
      <div className="space-y-6">
        {sections.map(section => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className={`grid gap-4 ${
                formSettings.layout === 'two-column' ? 'grid-cols-2' : 'grid-cols-1'
              }`}>
                {section.fields.map(field => renderFormField(field, section.id))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }, [sections, formSettings.layout, renderFormField]);

  // Generate form code
  const generateFormCode = useCallback(() => {
    const codeLines = [
      `// Generated ${standard} Token Form`,
      `import React from 'react';`,
      `import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';`,
      `import { Input } from '@/components/ui/input';`,
      `import { Label } from '@/components/ui/label';`,
      `import { Switch } from '@/components/ui/switch';`,
      `import { Textarea } from '@/components/ui/textarea';`,
      `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';`,
      ``,
      `export const ${standard}TokenForm = ({ formData, onFormDataChange }) => {`,
      `  return (`,
      `    <div className="space-y-6">`,
    ];

    sections.forEach(section => {
      codeLines.push(
        `      <Card>`,
        `        <CardHeader>`,
        `          <CardTitle>${section.title}</CardTitle>`,
      );
      
      if (section.description) {
        codeLines.push(
          `          <p className="text-sm text-muted-foreground">${section.description}</p>`
        );
      }
      
      codeLines.push(
        `        </CardHeader>`,
        `        <CardContent>`,
        `          <div className="grid gap-4 ${formSettings.layout === 'two-column' ? 'grid-cols-2' : 'grid-cols-1'}">`,
      );

      section.fields.forEach(field => {
        codeLines.push(
          `            <div className="space-y-2">`,
        );
        
        if (field.type !== 'boolean') {
          codeLines.push(
            `              <Label>${field.label}${field.required ? ' *' : ''}</Label>`
          );
        }
        
        // Generate field component code based on type
        switch (field.type) {
          case 'text':
          case 'number':
          case 'date':
          case 'address':
            codeLines.push(
              `              <Input`,
              `                type="${field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}"`,
              `                placeholder="${field.placeholder || ''}"`,
              `                value={formData.${field.name} || ''}`,
              `                onChange={(e) => onFormDataChange('${field.name}', e.target.value)}`,
              `              />`
            );
            break;
          
          case 'boolean':
            codeLines.push(
              `              <div className="flex items-center space-x-2">`,
              `                <Switch`,
              `                  checked={formData.${field.name} || false}`,
              `                  onCheckedChange={(value) => onFormDataChange('${field.name}', value)}`,
              `                />`,
              `                <Label>${field.label}</Label>`,
              `              </div>`
            );
            break;
          
          case 'textarea':
            codeLines.push(
              `              <Textarea`,
              `                placeholder="${field.placeholder || ''}"`,
              `                value={formData.${field.name} || ''}`,
              `                onChange={(e) => onFormDataChange('${field.name}', e.target.value)}`,
              `              />`
            );
            break;
          
          case 'select':
            codeLines.push(
              `              <Select`,
              `                value={formData.${field.name} || ''}`,
              `                onValueChange={(value) => onFormDataChange('${field.name}', value)}`,
              `              >`,
              `                <SelectTrigger>`,
              `                  <SelectValue placeholder="${field.placeholder || ''}" />`,
              `                </SelectTrigger>`,
              `                <SelectContent>`,
            );
            
            field.options?.forEach(option => {
              codeLines.push(`                  <SelectItem value="${option}">${option}</SelectItem>`);
            });
            
            codeLines.push(
              `                </SelectContent>`,
              `              </Select>`
            );
            break;
        }
        
        if (field.description) {
          codeLines.push(
            `              <p className="text-xs text-muted-foreground">${field.description}</p>`
          );
        }
        
        codeLines.push(`            </div>`);
      });

      codeLines.push(
        `          </div>`,
        `        </CardContent>`,
        `      </Card>`,
      );
    });

    codeLines.push(
      `    </div>`,
      `  );`,
      `};`,
      ``,
      `export default ${standard}TokenForm;`
    );

    return codeLines.join('\n');
  }, [standard, sections, formSettings.layout]);

  // Export form as JSON
  const exportForm = useCallback(() => {
    const exportData = {
      standard,
      sections,
      settings: formSettings,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${standard}_form_design.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [standard, sections, formSettings]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Visual Form Designer - {standard}
          </h2>
          
          <div className="flex items-center gap-2">
            <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as any)}>
              <TabsList>
                <TabsTrigger value="design">
                  <GearIcon className="mr-2 h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <EyeOpenIcon className="mr-2 h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="code">
                  <CodeIcon className="mr-2 h-4 w-4" />
                  Code
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button onClick={exportForm} variant="outline">
              <DownloadIcon className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {previewMode === 'design' && (
          <>
            {/* Settings Panel */}
            <div className="w-80 border-r p-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Form Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Theme</Label>
                    <Select value={formSettings.theme} onValueChange={(value) => 
                      setFormSettings(prev => ({ ...prev, theme: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="modern">Modern</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Layout</Label>
                    <Select value={formSettings.layout} onValueChange={(value) => 
                      setFormSettings(prev => ({ ...prev, layout: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single-column">Single Column</SelectItem>
                        <SelectItem value="two-column">Two Column</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Show Progress</Label>
                    <Switch
                      checked={formSettings.showProgress}
                      onCheckedChange={(checked) => 
                        setFormSettings(prev => ({ ...prev, showProgress: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>Auto Save</Label>
                    <Switch
                      checked={formSettings.autoSave}
                      onCheckedChange={(checked) => 
                        setFormSettings(prev => ({ ...prev, autoSave: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              {selectedField && (
                <div>
                  <h3 className="font-semibold mb-3">Field Properties</h3>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Selected:</strong> {selectedField}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedField(null)}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Design Area */}
            <div className="flex-1 p-4 overflow-auto">
              {renderFormPreview()}
            </div>
          </>
        )}

        {previewMode === 'preview' && (
          <div className="flex-1 p-4 overflow-auto">
            {renderFormPreview()}
          </div>
        )}

        {previewMode === 'code' && (
          <div className="flex-1 p-4">
            <div className="bg-muted rounded-lg p-4 h-full">
              <pre className="text-sm overflow-auto h-full">
                <code>{generateFormCode()}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualFormDesigner;
