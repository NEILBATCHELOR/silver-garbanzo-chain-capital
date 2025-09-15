import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Upload, Database } from 'lucide-react';
import UserDataSourceUploadEnhanced from './forms/UserDataSourceUploadEnhanced';
import DataSourceManager from './widgets/DataSourceManager';
import type { UserDataSource } from '../../../services/climateReceivables/userDataSourceService';

interface DataSourceDemoProps {
  className?: string;
}

export default function DataSourceDemo({ className = '' }: DataSourceDemoProps) {
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<UserDataSource | null>(null);

  const handleUploadComplete = (sourceId: string, source: UserDataSource) => {
    setUploadSuccess(`Successfully uploaded: ${source.source_name}`);
    setActiveTab('manage');
    
    // Clear success message after 5 seconds
    setTimeout(() => setUploadSuccess(null), 5000);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleSourceSelect = (source: UserDataSource) => {
    setSelectedSource(source);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Climate Data Sources Management</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Upload and manage climate data sources to enhance risk assessments with real market data, 
          credit reports, financial statements, and custom business intelligence.
        </p>
      </div>

      {/* Success Alert */}
      {uploadSuccess && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{uploadSuccess}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Data Sources
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Manage Data Sources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <UserDataSourceUploadEnhanced
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
          />

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Credit Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Upload S&P, Moody's, or custom credit assessments to enhance payer risk scoring
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Financial Statements</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Balance sheets, income statements, and cash flow data for comprehensive analysis
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Market Data</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Energy prices, commodity data, and economic indicators for risk adjustments
                </CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Custom Data</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Industry-specific data, proprietary analytics, or specialized business intelligence
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <DataSourceManager onSourceSelect={handleSourceSelect} />

          {/* Selected Source Details */}
          {selectedSource && (
            <Card>
              <CardHeader>
                <CardTitle>Selected Source: {selectedSource.source_name}</CardTitle>
                <CardDescription>
                  Integration ready for PayerRiskAssessmentService enhancement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Type</p>
                    <p className="font-medium capitalize">
                      {selectedSource.source_type.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Format</p>
                    <p className="font-medium uppercase">{selectedSource.data_format}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium capitalize">
                      {selectedSource.processing_status || 'pending'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Size</p>
                    <p className="font-medium">
                      {(selectedSource.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Integration Status:</strong> This data source is ready for integration 
                    with the PayerRiskAssessmentService to provide enhanced credit risk analysis 
                    with real market data and user-specific intelligence.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
