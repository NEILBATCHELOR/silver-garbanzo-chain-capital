/**
 * Enhanced Compliance Upload
 * 
 * Main orchestration component for compliance data and document uploads
 * Combines data upload and document upload phases with progress tracking
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  Circle,
  Upload,
  FileText,
  Users,
  Building,
  ArrowRight,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';

import { DataUploadPhase } from './DataUploadPhase';
import EnhancedDocumentUploadPhase from './EnhancedDocumentUploadPhase';
import { useEnhancedUpload } from '../hooks/useEnhancedUpload';

import type {
  UploadEntityType,
  UploadPhase,
  DataUploadConfig,
  DocumentUploadConfig,
  DataUploadResult,
  DocumentUploadResult,
  UploadProgress,
  EnhancedUploadProps
} from '../types/uploadTypes';

import type { Investor, Organization } from '@/types/core/centralModels';

export interface EnhancedComplianceUploadProps extends EnhancedUploadProps {
  onComplete?: (uploadedEntities: (Investor | Organization)[], documents?: any[]) => void;
  onCancel?: () => void;
  initialPhase?: UploadPhase;
  className?: string;
}

export const EnhancedComplianceUpload: React.FC<EnhancedComplianceUploadProps> = ({
  entityType,
  dataConfig = {},
  documentConfig = {},
  eventHandlers = {},
  autoAdvancePhases = true,
  allowPhaseSkip = false,
  onComplete,
  onCancel,
  initialPhase = 'data',
  className = ''
}) => {
  // State
  const [currentPhase, setCurrentPhase] = useState<UploadPhase>(initialPhase);
  const [uploadedEntities, setUploadedEntities] = useState<(Investor | Organization)[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<any[]>([]);
  const [dataUploadResult, setDataUploadResult] = useState<DataUploadResult | null>(null);
  const [documentUploadResult, setDocumentUploadResult] = useState<DocumentUploadResult | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);

  // Enhanced upload hook
  const {
    session,
    isUploading,
    progress,
    startSession,
    completeSession,
    resetSession
  } = useEnhancedUpload({ entityType, eventHandlers });

  // Phase management
  const phases: UploadPhase[] = ['data', 'documents', 'complete'];
  const currentPhaseIndex = phases.indexOf(currentPhase);

  // Handle data upload completion
  const handleDataUploadComplete = useCallback((result: DataUploadResult) => {
    console.log('Data upload completed:', result);
    setDataUploadResult(result);
    
    if (result.success && result.data?.entities) {
      console.log(`Setting uploaded entities: ${result.data.entities.length} entities`);
      console.log('Entities:', result.data.entities);
      setUploadedEntities(result.data.entities);
      setOverallProgress(50); // Data phase complete = 50%
      
      if (autoAdvancePhases) {
        setCurrentPhase('documents');
      }
      
      eventHandlers.onPhaseComplete?.('data', result);
    } else {
      console.error('Data upload failed or no entities:', result);
      if (!result.success) {
        console.error('Upload error:', result.error);
      }
    }
  }, [autoAdvancePhases, eventHandlers]);

  // Handle document upload completion
  const handleDocumentUploadComplete = useCallback((result: DocumentUploadResult) => {
    setDocumentUploadResult(result);
    
    if (result.success && result.data?.documents) {
      setUploadedDocuments(result.data.documents);
      setOverallProgress(100); // Document phase complete = 100%
      
      if (autoAdvancePhases) {
        setCurrentPhase('complete');
      }
      
      eventHandlers.onPhaseComplete?.('documents', result);
    }
  }, [autoAdvancePhases, eventHandlers]);

  // Handle phase navigation
  const goToPhase = useCallback((phase: UploadPhase) => {
    if (phase === 'documents' && uploadedEntities.length === 0 && !allowPhaseSkip) {
      return; // Can't go to documents without data
    }
    setCurrentPhase(phase);
  }, [uploadedEntities.length, allowPhaseSkip]);

  // Handle overall completion
  const handleComplete = useCallback(() => {
    onComplete?.(uploadedEntities, uploadedDocuments);
    completeSession();
  }, [uploadedEntities, uploadedDocuments, onComplete, completeSession]);

  // Handle reset
  const handleReset = useCallback(() => {
    setCurrentPhase('data');
    setUploadedEntities([]);
    setUploadedDocuments([]);
    setDataUploadResult(null);
    setDocumentUploadResult(null);
    setOverallProgress(0);
    resetSession();
  }, [resetSession]);

  // Progress calculation
  const phaseProgress = progress?.percentage || 0;
  const totalProgress = currentPhase === 'data' 
    ? phaseProgress * 0.5 
    : currentPhase === 'documents' 
      ? 50 + (phaseProgress * 0.5)
      : 100;

  const entityLabel = entityType === 'investor' ? 'Investor' : 'Issuer';
  const entityIcon = entityType === 'investor' ? Users : Building;

  return (
    <div className={`w-full max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader className="pb-4 pt-6">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-primary/10 p-2">
              {React.createElement(entityIcon, { className: "h-6 w-6 text-primary" })}
            </div>
            <div>
              <CardTitle className="text-2xl font-semibold">
                Enhanced {entityLabel} Upload
              </CardTitle>
              <CardDescription className="mt-1">
                Upload {entityLabel.toLowerCase()} data and documents in a streamlined workflow
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(totalProgress)}%
              </span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>

          {/* Phase Navigation */}
          <div className="flex items-center justify-between">
            {phases.slice(0, -1).map((phase, index) => {
              const isActive = currentPhase === phase;
              const isCompleted = currentPhaseIndex > index;
              const isAccessible = index === 0 || uploadedEntities.length > 0 || allowPhaseSkip;

              return (
                <React.Fragment key={phase}>
                  <Button
                    variant={isActive ? "default" : isCompleted ? "outline" : "ghost"}
                    size="sm"
                    className={`flex items-center space-x-2 ${
                      !isAccessible ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    onClick={() => isAccessible && goToPhase(phase)}
                    disabled={!isAccessible}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                    <span className="capitalize">
                      {phase === 'data' ? `${entityLabel} Data` : 'Documents'}
                    </span>
                    {phase === 'data' && uploadedEntities.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {uploadedEntities.length}
                      </Badge>
                    )}
                  </Button>
                  {index < phases.length - 2 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Phase Content */}
      {currentPhase === 'data' && (
        <DataUploadPhase
          entityType={entityType}
          config={dataConfig}
          onComplete={handleDataUploadComplete}
          onProgress={(progress) => setOverallProgress(progress.percentage * 0.5)}
          onCancel={onCancel}
          disabled={isUploading}
        />
      )}

      {currentPhase === 'documents' && (
        <EnhancedDocumentUploadPhase
          entityType={entityType}
          entities={uploadedEntities}
          config={documentConfig}
          onComplete={handleDocumentUploadComplete}
          onProgress={(progress) => setOverallProgress(50 + (progress.percentage * 0.5))}
          onCancel={onCancel}
          disabled={isUploading}
        />
      )}

      {currentPhase === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span>Upload Complete</span>
            </CardTitle>
            <CardDescription>
              Successfully completed {entityLabel.toLowerCase()} upload process
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {uploadedEntities.length}
                    </div>
                    <div className="text-sm text-green-700">
                      {entityLabel}s Uploaded
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Upload className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {uploadedDocuments.length}
                    </div>
                    <div className="text-sm text-blue-700">
                      Documents Uploaded
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <Tabs defaultValue="data" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="data">{entityLabel} Data</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-4">
                {dataUploadResult?.success ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Data Upload Successful</AlertTitle>
                    <AlertDescription>
                      {dataUploadResult.details && (
                        <>
                          Processed {dataUploadResult.details.processed} of {dataUploadResult.details.total} records.
                          {dataUploadResult.details.updated > 0 && (
                            <> Updated {dataUploadResult.details.updated} existing records.</>
                          )}
                          {dataUploadResult.details.failed > 0 && (
                            <> {dataUploadResult.details.failed} records failed to process.</>
                          )}
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTitle>Data Upload Failed</AlertTitle>
                    <AlertDescription>
                      {dataUploadResult?.error || 'Unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                {documentUploadResult?.success ? (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Document Upload Successful</AlertTitle>
                    <AlertDescription>
                      Successfully uploaded {uploadedDocuments.length} documents.
                    </AlertDescription>
                  </Alert>
                ) : documentUploadResult ? (
                  <Alert variant="destructive">
                    <AlertTitle>Document Upload Failed</AlertTitle>
                    <AlertDescription>
                      {documentUploadResult.error || 'Unknown error occurred'}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert>
                    <AlertTitle>Documents Not Uploaded</AlertTitle>
                    <AlertDescription>
                      No documents were uploaded in this session.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Start New Upload</span>
              </Button>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={onCancel}>
                  Close
                </Button>
                <Button onClick={handleComplete}>
                  Complete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedComplianceUpload;
