import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Edit } from 'lucide-react';
import { FieldConfig } from './types';

interface FieldRendererProps {
  config: FieldConfig;
  value: any;
  onChange: (value: any) => void;
  error?: string[];
  mode: 'basic' | 'advanced';
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({
  config,
  value,
  onChange,
  error,
  mode
}) => {
  // Don't render field if it's not configured for the current mode
  if (mode === 'basic' && !config.showInBasic) return null;
  if (mode === 'advanced' && !config.showInAdvanced) return null;

  const hasError = error && error.length > 0;

  const renderField = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'border-red-500' : ''}
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className={hasError ? 'border-red-500' : ''}
            min={config.validation?.min}
            max={config.validation?.max}
            placeholder={`Enter ${config.label.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={onChange}
            />
            <span className="text-sm text-muted-foreground">
              {Boolean(value) ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={hasError ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'border-red-500' : ''}
            placeholder={`Enter ${config.label.toLowerCase()}`}
            rows={4}
          />
        );

      case 'json':
        return (
          <Textarea
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch {
                // Invalid JSON, keep the string for now
                onChange(e.target.value);
              }
            }}
            className={`font-mono ${hasError ? 'border-red-500' : ''}`}
            placeholder={`Enter JSON for ${config.label.toLowerCase()}`}
            rows={6}
          />
        );

      case 'array':
        return (
          <ArrayFieldRenderer
            value={value || []}
            onChange={onChange}
            label={config.label}
            hasError={hasError}
          />
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={config.name} className="text-sm font-medium">
          {config.label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {mode === 'advanced' && (
          <Badge variant="outline" className="text-xs">
            {config.type}
          </Badge>
        )}
      </div>
      
      {renderField()}
      
      {config.description && (
        <p className="text-xs text-muted-foreground">{config.description}</p>
      )}
      
      {hasError && (
        <div className="text-xs text-red-500">
          {error!.map((err, idx) => (
            <div key={idx}>{err}</div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ArrayFieldRendererProps {
  value: any[];
  onChange: (value: any[]) => void;
  label: string;
  hasError: boolean;
}

const ArrayFieldRenderer: React.FC<ArrayFieldRendererProps> = ({
  value,
  onChange,
  label,
  hasError
}) => {
  const addItem = () => {
    onChange([...value, '']);
  };

  const updateItem = (index: number, newValue: string) => {
    const updated = [...value];
    updated[index] = newValue;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className={`space-y-2 ${hasError ? 'border border-red-500 rounded p-2' : ''}`}>
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            placeholder={`${label} ${index + 1}`}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removeItem(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        type="button"
        variant="outline"
        onClick={addItem}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add {label}
      </Button>
    </div>
  );
};

interface RelatedTableRendererProps {
  title: string;
  description: string;
  data: any[];
  fields: FieldConfig[];
  onAdd: (record: any) => void;
  onUpdate: (index: number, record: any) => void;
  onDelete: (index: number) => void;
  mode: 'basic' | 'advanced';
}

export const RelatedTableRenderer: React.FC<RelatedTableRendererProps> = ({
  title,
  description,
  data,
  fields,
  onAdd,
  onUpdate,
  onDelete,
  mode
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState<any>({});

  const visibleFields = fields.filter(field => 
    mode === 'basic' ? field.showInBasic : field.showInAdvanced
  );

  const handleAdd = () => {
    onAdd(newRecord);
    setNewRecord({});
  };

  const handleUpdate = (index: number, record: any) => {
    onUpdate(index, record);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Add New Record */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add New Record</CardTitle>
          <CardDescription>Create a new {title.toLowerCase()} entry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {visibleFields.map((field) => (
              <FieldRenderer
                key={field.name}
                config={field}
                value={newRecord[field.name]}
                onChange={(value) => setNewRecord(prev => ({ ...prev, [field.name]: value }))}
                mode={mode}
              />
            ))}
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {title}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Records */}
      <div className="space-y-4">
        <h4 className="text-base font-semibold">
          Existing Records ({data.length})
        </h4>
        
        {data.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No {title.toLowerCase()} records found</p>
            </CardContent>
          </Card>
        ) : (
          data.map((record, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    {title} #{index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDelete(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editingIndex === index ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      {visibleFields.map((field) => (
                        <FieldRenderer
                          key={field.name}
                          config={field}
                          value={record[field.name]}
                          onChange={(value) => {
                            const updated = { ...record, [field.name]: value };
                            handleUpdate(index, updated);
                          }}
                          mode={mode}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {visibleFields.slice(0, mode === 'basic' ? 4 : undefined).map((field) => (
                      <div key={field.name} className="flex justify-between text-sm">
                        <span className="font-medium">{field.label}:</span>
                        <span className="text-muted-foreground">
                          {record[field.name] !== null && record[field.name] !== undefined 
                            ? String(record[field.name]) 
                            : 'Not set'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

function useState<T>(initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  return React.useState(initialValue);
}
