/**
 * Enhanced Document Upload Phase Component
 * 
 * Updated to use the simplified document management interface
 * without tabs and with corrected enum values
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Building,
  ArrowRight
} from 'lucide-react';

// Import the simplified document management component
import SimplifiedDocumentManagement from '@/components/compliance/operations/documents/components/SimplifiedDocumentManagement';

import type { Investor, Organization } from '@/types/core/centralModels';
import { InvestorEntityType } from '@/types/core/centralModels';
import type {
  UploadEntityType,
  DocumentUploadConfig,
  DocumentUploadResult,
  UploadProgress
} from '../types/uploadTypes';

export interface EnhancedDocumentUploadPhaseProps {
  entityType: UploadEntityType;
  entities: (Investor | Organization)[];
  config?: Partial<DocumentUploadConfig>;
  onComplete?: (result: DocumentUploadResult) => void;
  onProgress?: (progress: UploadProgress) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

export const EnhancedDocumentUploadPhase: React.FC<EnhancedDocumentUploadPhaseProps> = ({
  entityType,
  entities,
  config = {},
  onComplete,
  onProgress,
  onCancel,
  disabled = false
}) => {
  // State
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('selection');
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [completedEntities, setCompletedEntities] = useState<Set<string>>(new Set());
  const [isCompleting, setIsCompleting] = useState(false);

  // Select first entity by default
  React.useEffect(() => {
    console.log('EnhancedDocumentUploadPhase received entities:', entities);
    console.log('Entity count:', entities.length);
    if (entities.length > 0 && !selectedEntityId) {
      console.log('Setting default entity:', entities[0]);
      setSelectedEntityId(entities[0].id);
      setActiveTab('upload');
    } else if (entities.length === 0) {
      console.warn('No entities provided to EnhancedDocumentUploadPhase');
    }
  }, [entities, selectedEntityId]);

  // Computed values
  const selectedEntity = useMemo(
    () => entities.find(e => e.id === selectedEntityId),
    [entities, selectedEntityId]
  );

  const totalEntities = entities.length;
  const completedCount = completedEntities.size;
  const progressPercentage = totalEntities > 0 ? (completedCount / totalEntities) * 100 : 0;

  // Handle document uploaded for current entity
  const handleDocumentUploaded = useCallback(() => {
    // Add current entity to completed set
    if (selectedEntityId) {
      setCompletedEntities(prev => new Set([...prev, selectedEntityId]));
    }
    
    // Update progress
    onProgress?.({
      phase: 'documents',
      percentage: progressPercentage,
      message: `Documents uploaded for ${completedCount + 1} of ${totalEntities} entities`
    });

    // Force refresh of document count
    setUploadedDocuments(prev => [...prev, { entityId: selectedEntityId, timestamp: Date.now() }]);
  }, [selectedEntityId, completedCount, totalEntities, progressPercentage, onProgress]);

  // Mark entity as completed manually
  const markEntityCompleted = useCallback(() => {
    if (selectedEntityId) {
      setCompletedEntities(prev => new Set([...prev, selectedEntityId]));
      
      // Update progress
      const newCompletedCount = completedEntities.size + 1;
      const newProgressPercentage = totalEntities > 0 ? (newCompletedCount / totalEntities) * 100 : 0;
      
      onProgress?.({
        phase: 'documents',
        percentage: newProgressPercentage,
        message: `Documents completed for ${newCompletedCount} of ${totalEntities} entities`
      });
    }
  }, [selectedEntityId, completedEntities.size, totalEntities, onProgress]);

  // Complete upload phase
  const handleCompletePhase = useCallback(async () => {
    setIsCompleting(true);
    
    try {
      // Simulate completion delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result: DocumentUploadResult = {
        success: true,
        data: {
          documents: uploadedDocuments,
          failed: [],
          entityDocumentCounts: Object.fromEntries(
            Array.from(completedEntities).map(entityId => [entityId, 1])
          )
        }
      };

      onComplete?.(result);
    } catch (error) {
      console.error('Failed to complete document upload phase:', error);
      
      const result: DocumentUploadResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete document upload',
        data: { documents: [], failed: [], entityDocumentCounts: {} }
      };

      onComplete?.(result);
    } finally {
      setIsCompleting(false);
    }
  }, [uploadedDocuments, completedEntities, onComplete]);

  // Get entity type labels
  const entityLabel = entityType === 'investor' ? 'Investor' : 'Issuer';
  const entityMode = entityType === 'investor' ? 'investor' : 'issuer';

  // Determine investor type for investor entities
  const getInvestorType = (entity: Investor): 'individual' | 'corporate' | 'trust' => {
    if ('type' in entity && entity.type) {
      const entityType = entity.type;
      switch (entityType) {
        case InvestorEntityType.INSTITUTIONAL:
          return 'corporate';
        case InvestorEntityType.SYNDICATE:
          return 'corporate';
        default:
          // Handle string values that might not be in the enum
          if (typeof entityType === 'string') {
            if (entityType.toLowerCase() === 'trust') {
              return 'trust';
            }
            if (entityType.toLowerCase().includes('institutional') || entityType.toLowerCase().includes('corporate')) {
              return 'corporate';
            }
          }
          return 'individual';
      }
    }
    return 'individual';
  };

  return (
    <div className="w-full space-y-6">
      {/* Header with Progress */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload {entityLabel} Documents
          </CardTitle>
          <CardDescription>
            Upload supporting documents for each {entityLabel.toLowerCase()}. 
            Complete document upload for all entities to proceed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress Summary */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                {entityType === 'investor' ? <Users className="h-3 w-3" /> : <Building className="h-3 w-3" />}
                {totalEntities} {entityLabel}s
              </Badge>
              <Badge variant={completedCount === totalEntities ? "default" : "secondary"}>
                {completedCount} of {totalEntities} completed
              </Badge>
            </div>
            
            {completedCount === totalEntities && (
              <Button 
                onClick={handleCompletePhase}
                disabled={isCompleting || disabled}
                className="flex items-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Complete Document Upload
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Document Upload Progress</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Entity Selection & Document Upload */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="selection" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Select {entityLabel}
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={!selectedEntityId}>
            <Upload className="h-4 w-4" />
            Upload Documents
          </TabsTrigger>
        </TabsList>

        {/* Entity Selection Tab */}
        <TabsContent value="selection" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Select {entityLabel} for Document Upload</CardTitle>
              <CardDescription>
                Choose an {entityLabel.toLowerCase()} to upload documents for, then switch to the upload tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={selectedEntityId}
                onValueChange={(value) => {
                  setSelectedEntityId(value);
                  setActiveTab('upload');
                }}
                disabled={disabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={`Select an ${entityLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {entities.length > 0 ? (
                    entities.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{entity.name}</span>
                          {completedEntities.has(entity.id) && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-entities" disabled>
                      <div className="text-gray-500 text-sm">
                        No {entityLabel.toLowerCase()}s available. Please complete Step 1 first.
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Entity List */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Available {entityLabel}s:</h4>
                <div className="grid gap-2">
                  {entities.length > 0 ? (
                    entities.map((entity) => (
                      <div
                        key={entity.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedEntityId === entity.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedEntityId(entity.id);
                          setActiveTab('upload');
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{entity.name}</div>
                            {('email' in entity ? entity.email : entity.contactEmail) && (
                              <div className="text-sm text-muted-foreground">
                                {'email' in entity ? entity.email : entity.contactEmail}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {completedEntities.has(entity.id) ? (
                              <Badge variant="default" className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No {entityLabel}s Available</AlertTitle>
                      <AlertDescription>
                        No {entityLabel.toLowerCase()}s were found from Step 1. Please:
                        <br />• Go back to Step 1 and upload your {entityLabel.toLowerCase()} data
                        <br />• Ensure the upload completed successfully
                        <br />• Check the browser console for any error messages
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Document Upload Tab */}
        <TabsContent value="upload" className="mt-6">
          {selectedEntity ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Upload Documents for {selectedEntity.name}</span>
                  <div className="flex items-center gap-2">
                    {completedEntities.has(selectedEntity.id) ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Completed
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={markEntityCompleted}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  Upload required documents using the simplified interface below.
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {/* Simplified Document Management Component */}
                <SimplifiedDocumentManagement
                  mode={entityMode}
                  entityId={selectedEntity.id}
                  entityName={selectedEntity.name}
                  embedded={true}
                  isRegulated={true}
                  investorType={entityType === 'investor' ? getInvestorType(selectedEntity as Investor) : undefined}
                />
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No {entityLabel} Selected</AlertTitle>
              <AlertDescription>
                Please select an {entityLabel.toLowerCase()} from the selection tab to upload documents.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={disabled || isCompleting}
        >
          Cancel
        </Button>
        
        <div className="flex gap-2">
          {activeTab === 'upload' && completedCount < totalEntities && (
            <Button
              variant="outline"
              onClick={() => {
                // Find next incomplete entity
                const nextEntity = entities.find(e => !completedEntities.has(e.id));
                if (nextEntity) {
                  setSelectedEntityId(nextEntity.id);
                }
              }}
              disabled={disabled}
            >
              Next {entityLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDocumentUploadPhase;
