import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, X, AlertCircle, Settings, Database } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { EditFormProps, TokenEditFormState, TabConfig } from './types';

interface BaseTokenEditFormProps extends EditFormProps {
  tokenStandard: string;
  tabs: TabConfig[];
  children: React.ReactNode;
}

const BaseTokenEditForm: React.FC<BaseTokenEditFormProps> = ({
  tokenId,
  mode,
  tokenStandard,
  tabs,
  onSave,
  onCancel,
  enableDebug = false,
  children
}) => {
  const { toast } = useToast();
  const [state, setState] = useState<TokenEditFormState>({
    activeTab: 'basic',
    tokenData: {},
    propertiesData: {},
    relatedData: {},
    isLoading: true,
    errors: {},
    isDirty: false
  });

  // Load token data on mount
  useEffect(() => {
    loadTokenData();
  }, [tokenId]);

  const loadTokenData = async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Load main token data
      const response = await fetch(`/api/tokens/${tokenId}`);
      const tokenData = await response.json();
      
      // Load properties data based on standard
      const propertiesResponse = await fetch(`/api/tokens/${tokenId}/properties/${tokenStandard.toLowerCase()}`);
      const propertiesData = await propertiesResponse.json();
      
      // Load related table data
      const relatedData: Record<string, any[]> = {};
      for (const tab of tabs.filter(t => t.isRelational)) {
        const relatedResponse = await fetch(`/api/tokens/${tokenId}/${tab.table}`);
        relatedData[tab.table] = await relatedResponse.json();
      }
      
      setState(prev => ({
        ...prev,
        tokenData,
        propertiesData,
        relatedData,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Error loading token data:', error);
      toast({
        title: "Error",
        description: "Failed to load token data",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleSave = async () => {
    if (!state.isDirty) return;
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const saveData = {
        tokenData: state.tokenData,
        propertiesData: state.propertiesData,
        relatedData: state.relatedData
      };
      
      if (onSave) {
        await onSave(saveData);
      }
      
      setState(prev => ({ ...prev, isDirty: false, isLoading: false }));
      
      toast({
        title: "Success",
        description: "Token updated successfully",
      });
      
    } catch (error) {
      console.error('Error saving token:', error);
      toast({
        title: "Error",
        description: "Failed to save token changes",
        variant: "destructive",
      });
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const updateTokenData = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      tokenData: { ...prev.tokenData, [field]: value },
      isDirty: true
    }));
  };

  const updatePropertiesData = (field: string, value: any) => {
    setState(prev => ({
      ...prev,
      propertiesData: { ...prev.propertiesData, [field]: value },
      isDirty: true
    }));
  };

  const updateRelatedData = (table: string, data: any[]) => {
    setState(prev => ({
      ...prev,
      relatedData: { ...prev.relatedData, [table]: data },
      isDirty: true
    }));
  };

  const addRelatedRecord = (table: string, record: any) => {
    setState(prev => ({
      ...prev,
      relatedData: {
        ...prev.relatedData,
        [table]: [...(prev.relatedData[table] || []), record]
      },
      isDirty: true
    }));
  };

  const updateRelatedRecord = (table: string, index: number, record: any) => {
    setState(prev => {
      const updatedRecords = [...(prev.relatedData[table] || [])];
      updatedRecords[index] = record;
      return {
        ...prev,
        relatedData: { ...prev.relatedData, [table]: updatedRecords },
        isDirty: true
      };
    });
  };

  const deleteRelatedRecord = (table: string, index: number) => {
    setState(prev => {
      const updatedRecords = [...(prev.relatedData[table] || [])];
      updatedRecords.splice(index, 1);
      return {
        ...prev,
        relatedData: { ...prev.relatedData, [table]: updatedRecords },
        isDirty: true
      };
    });
  };

  if (state.isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading token data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                {tokenStandard} Token Configuration
                <Badge variant={mode === 'advanced' ? 'default' : 'secondary'}>
                  {mode === 'advanced' ? 'Advanced' : 'Basic'} Mode
                </Badge>
                {enableDebug && (
                  <Badge variant="outline" className="border-blue-500 text-blue-700">
                    Debug Mode
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Token ID: {tokenId} | Name: {state.tokenData.name || 'Unnamed'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {state.isDirty && (
                <Badge variant="outline" className="text-orange-600 border-orange-300">
                  Unsaved Changes
                </Badge>
              )}
              <Button variant="outline" onClick={onCancel} disabled={state.isLoading}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={state.isLoading || !state.isDirty}
              >
                {state.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {Object.keys(state.errors).length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please fix the following errors:
            <ul className="mt-2 list-disc list-inside">
              {Object.entries(state.errors).map(([field, errors]) => (
                <li key={field}>
                  <strong>{field}:</strong> {errors.join(', ')}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabbed Interface */}
      <Card>
        <CardContent className="p-0">
          <Tabs
            value={state.activeTab}
            onValueChange={(value) => setState(prev => ({ ...prev, activeTab: value }))}
            className="w-full"
          >
            <div className="border-b">
              <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                    {tab.id === 'basic' ? (
                      <Settings className="h-4 w-4" />
                    ) : (
                      <Database className="h-4 w-4" />
                    )}
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{tab.label}</h3>
                    <p className="text-sm text-muted-foreground">{tab.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">Table: {tab.table}</Badge>
                      {mode === 'basic' && tab.fields.length > 10 && (
                        <Badge variant="secondary">
                          Showing {Math.min(10, tab.fields.length)} of {tab.fields.length} fields
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Tab content will be rendered by children */}
                  <div className="min-h-[400px]">
                    {React.Children.map(children, (child) => {
                      if (React.isValidElement(child)) {
                        return React.cloneElement(child as React.ReactElement<any>, {
                          activeTab: state.activeTab,
                          tabConfig: tab,
                          mode,
                          tokenData: state.tokenData,
                          propertiesData: state.propertiesData,
                          relatedData: state.relatedData[tab.table] || [],
                          onUpdateToken: updateTokenData,
                          onUpdateProperties: updatePropertiesData,
                          onUpdateRelated: updateRelatedData,
                          onAddRelated: addRelatedRecord,
                          onUpdateRelatedRecord: updateRelatedRecord,
                          onDeleteRelatedRecord: deleteRelatedRecord,
                          errors: state.errors[tab.id] || []
                        });
                      }
                      return child;
                    })}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BaseTokenEditForm;
