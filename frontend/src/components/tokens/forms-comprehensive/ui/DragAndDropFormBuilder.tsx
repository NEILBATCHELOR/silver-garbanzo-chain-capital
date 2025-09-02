// Advanced UI Components for Comprehensive Token Forms
// Drag-and-drop field builder and visual form designer

import React, { useState, useCallback, DragEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  DragHandleDots2Icon, 
  PlusIcon, 
  TrashIcon,
  GearIcon,
  EyeOpenIcon,
  CopyIcon
} from '@radix-ui/react-icons';
import { TokenStandard } from '@/types/core/centralModels';

export interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'date' | 'address';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    custom?: string;
  };
  defaultValue?: any;
  description?: string;
  category: string;
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  fields: FieldDefinition[];
  order: number;
  collapsible: boolean;
  defaultCollapsed: boolean;
}

export interface DragAndDropFormBuilderProps {
  standard: TokenStandard;
  sections: FormSection[];
  onSectionsChange: (sections: FormSection[]) => void;
  availableFields: FieldDefinition[];
  onPreview: () => void;
}

export const DragAndDropFormBuilder: React.FC<DragAndDropFormBuilderProps> = ({
  standard,
  sections,
  onSectionsChange,
  availableFields,
  onPreview
}) => {
  const [draggedField, setDraggedField] = useState<FieldDefinition | null>(null);
  const [draggedFromSection, setDraggedFromSection] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Handle drag start for available fields
  const handleFieldDragStart = useCallback((e: DragEvent, field: FieldDefinition) => {
    setDraggedField(field);
    setDraggedFromSection(null);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', field.id);
  }, []);

  // Handle drag start for existing fields in sections
  const handleSectionFieldDragStart = useCallback((
    e: DragEvent, 
    field: FieldDefinition, 
    sectionId: string
  ) => {
    setDraggedField(field);
    setDraggedFromSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', field.id);
  }, []);

  // Handle drop on section
  const handleSectionDrop = useCallback((e: DragEvent, targetSectionId: string) => {
    e.preventDefault();
    
    if (!draggedField) return;

    const newSections = [...sections];
    const targetSection = newSections.find(s => s.id === targetSectionId);
    
    if (!targetSection) return;

    if (draggedFromSection) {
      // Moving field between sections
      const sourceSection = newSections.find(s => s.id === draggedFromSection);
      if (sourceSection) {
        sourceSection.fields = sourceSection.fields.filter(f => f.id !== draggedField.id);
      }
    }

    // Add field to target section (create new instance if copying)
    const fieldToAdd = draggedFromSection 
      ? draggedField 
      : { ...draggedField, id: `${draggedField.id}_${Date.now()}` };
    
    targetSection.fields.push(fieldToAdd);
    
    onSectionsChange(newSections);
    setDraggedField(null);
    setDraggedFromSection(null);
  }, [sections, draggedField, draggedFromSection, onSectionsChange]);

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedFromSection ? 'move' : 'copy';
  }, [draggedFromSection]);

  // Add new section
  const addSection = useCallback(() => {
    const newSection: FormSection = {
      id: `section_${Date.now()}`,
      title: 'New Section',
      description: 'Section description',
      fields: [],
      order: sections.length,
      collapsible: true,
      defaultCollapsed: false
    };
    
    onSectionsChange([...sections, newSection]);
  }, [sections, onSectionsChange]);

  // Remove section
  const removeSection = useCallback((sectionId: string) => {
    const newSections = sections.filter(s => s.id !== sectionId);
    onSectionsChange(newSections);
  }, [sections, onSectionsChange]);

  // Remove field from section
  const removeField = useCallback((sectionId: string, fieldId: string) => {
    const newSections = sections.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          fields: section.fields.filter(f => f.id !== fieldId)
        };
      }
      return section;
    });
    
    onSectionsChange(newSections);
  }, [sections, onSectionsChange]);

  // Update section title
  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    const newSections = sections.map(section => {
      if (section.id === sectionId) {
        return { ...section, title };
      }
      return section;
    });
    
    onSectionsChange(newSections);
  }, [sections, onSectionsChange]);

  return (
    <div className="flex h-full gap-4">
      {/* Available Fields Panel */}
      <div className="w-80 border-r bg-muted/30 p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <GearIcon />
          Available Fields
        </h3>
        
        <div className="space-y-2">
          {availableFields.map(field => (
            <Card
              key={field.id}
              className="cursor-move hover:shadow-md transition-shadow"
              draggable
              onDragStart={(e) => handleFieldDragStart(e, field)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DragHandleDots2Icon className="text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.type}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {field.category}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Form Builder Area */}
      <div className="flex-1 p-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {standard} Form Builder
          </h2>
          
          <div className="flex gap-2">
            <Button onClick={addSection} variant="outline">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Section
            </Button>
            <Button onClick={onPreview}>
              <EyeOpenIcon className="mr-2 h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map(section => (
            <Card key={section.id} className="p-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      className="font-semibold text-lg border-none p-0 h-auto"
                    />
                    {section.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {section.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSection(section.id)}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div
                  className={`min-h-24 border-2 border-dashed rounded-lg p-4 transition-colors ${
                    section.fields.length === 0 
                      ? 'border-muted-foreground/25 bg-muted/10' 
                      : 'border-border'
                  }`}
                  onDrop={(e) => handleSectionDrop(e, section.id)}
                  onDragOver={handleDragOver}
                >
                  {section.fields.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      Drop fields here to add them to this section
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {section.fields.map(field => (
                        <Card
                          key={field.id}
                          className="cursor-move"
                          draggable
                          onDragStart={(e) => handleSectionFieldDragStart(e, field, section.id)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <DragHandleDots2Icon className="text-muted-foreground" />
                                <div>
                                  <div className="font-medium text-sm">{field.label}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {field.type}
                                    {field.required && (
                                      <Badge variant="destructive" className="ml-1 text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingField(field.id)}
                                >
                                  <GearIcon className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeField(section.id, field.id)}
                                >
                                  <TrashIcon className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            {field.description && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {field.description}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {sections.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="text-muted-foreground">
                <GearIcon className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Start Building Your Form</h3>
                <p className="mb-4">
                  Add sections and drag fields from the left panel to create your custom token form.
                </p>
                <Button onClick={addSection}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Your First Section
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DragAndDropFormBuilder;
