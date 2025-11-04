// Comprehensive Token Form State Hook
// Manages state for all 51 token tables with full CRUD capabilities

import { useState, useCallback, useEffect } from 'react';
import { 
  ComprehensiveFormState, 
  FormTabState, 
  TokenTableData, 
  FormEventHandlers,
  ConfigMode
} from '../types';
import { TokenStandard } from '@/types/core/centralModels';
import { tokenCRUDService } from '../services/tokenCRUDService';
import { useToast } from '@/components/ui/use-toast';

interface UseComprehensiveTokenFormProps {
  tokenId?: string;
  standard: TokenStandard;
  configMode?: ConfigMode;
  enableDebug?: boolean;
}

export function useComprehensiveTokenForm({
  tokenId,
  standard,
  configMode = 'min',
  enableDebug = false
}: UseComprehensiveTokenFormProps) {
  const { toast } = useToast();
  
  // Initialize form state
  const [formState, setFormState] = useState<ComprehensiveFormState>({
    tokenId,
    standard,
    configMode,
    activeTab: 'tokens',
    projectId: undefined, // 🆕 ADD PROJECT ID TO STATE
    tabs: {},
    globalErrors: [],
    isSubmitting: false
  });

  // Load initial data
  useEffect(() => {
    if (tokenId) {
      loadAllData();
    } else {
      // Initialize empty form for new token
      initializeEmptyForm();
    }
  }, [tokenId, standard]);

  const loadAllData = useCallback(async () => {
    if (!tokenId) return;
    
    try {
      setFormState(prev => ({ ...prev, isSubmitting: true }));
      
      const allData = await tokenCRUDService.loadAllTokenData(tokenId, standard);
      const tables = tokenCRUDService.getTablesForStandard(standard);
      
      // 🆕 EXTRACT PROJECT ID FROM TOKENS TABLE
      const tokenData = allData['tokens'];
      const projectId = tokenData?.project_id;
      
      const newTabs: Record<string, FormTabState> = {};
      
      for (const table of tables) {
        const tableData = allData[table];
        newTabs[table] = {
          isModified: false,
          hasErrors: false,
          data: Array.isArray(tableData) ? tableData : [tableData],
          validationErrors: {}
        };
      }
      
      setFormState(prev => ({
        ...prev,
        projectId, // 🆕 SET PROJECT ID IN STATE
        tabs: newTabs,
        isSubmitting: false,
        globalErrors: []
      }));
      
    } catch (error) {
      console.error('Error loading token data:', error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        globalErrors: [`Failed to load token data: ${error.message}`]
      }));
      
      if (enableDebug) {
        toast({
          title: "Data Load Error",
          description: `Failed to load token data: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  }, [tokenId, standard, enableDebug, toast]);

  const initializeEmptyForm = useCallback(() => {
    const tables = tokenCRUDService.getTablesForStandard(standard);
    const newTabs: Record<string, FormTabState> = {};
    
    for (const table of tables) {
      newTabs[table] = {
        isModified: false,
        hasErrors: false,
        data: table === 'tokens' ? [{}] : [],
        validationErrors: {}
      };
    }
    
    setFormState(prev => ({
      ...prev,
      tabs: newTabs
    }));
  }, [standard]);

  // Event handlers
  const handleTabChange = useCallback((tabId: string) => {
    setFormState(prev => ({
      ...prev,
      activeTab: tabId
    }));
  }, []);

  const handleFieldChange = useCallback((table: string, field: string, value: any, recordIndex = 0) => {
    setFormState(prev => {
      const currentTab = prev.tabs[table];
      if (!currentTab) return prev;
      
      const newData = [...(Array.isArray(currentTab.data) ? currentTab.data : [currentTab.data])];
      
      // Ensure record exists
      while (newData.length <= recordIndex) {
        newData.push({});
      }
      
      // Update the field
      newData[recordIndex] = {
        ...newData[recordIndex],
        [field]: value
      };
      
      return {
        ...prev,
        tabs: {
          ...prev.tabs,
          [table]: {
            ...currentTab,
            data: newData,
            isModified: true
          }
        }
      };
    });
    
    if (enableDebug) {
      console.log(`Field changed: ${table}.${field} = ${value}`);
    }
  }, [enableDebug]);

  const validateTab = useCallback(async (table: string): Promise<boolean> => {
    const tabData = formState.tabs[table];
    if (!tabData) return false;
    
    try {
      const dataArray = Array.isArray(tabData.data) ? tabData.data : [tabData.data];
      let hasErrors = false;
      const allErrors: Record<string, string[]> = {};
      
      for (let i = 0; i < dataArray.length; i++) {
        const record = dataArray[i];
        const errors = await tokenCRUDService.validateTableData(table, record);
        
        if (Object.keys(errors).length > 0) {
          hasErrors = true;
          Object.entries(errors).forEach(([field, fieldErrors]) => {
            const key = `${i}.${field}`;
            allErrors[key] = fieldErrors;
          });
        }
      }
      
      setFormState(prev => ({
        ...prev,
        tabs: {
          ...prev.tabs,
          [table]: {
            ...prev.tabs[table],
            hasErrors,
            validationErrors: allErrors
          }
        }
      }));
      
      return !hasErrors;
    } catch (error) {
      console.error(`Validation error for table ${table}:`, error);
      return false;
    }
  }, [formState.tabs]);

  const saveTab = useCallback(async (table: string): Promise<void> => {
    const tabData = formState.tabs[table];
    if (!tabData || !tabData.isModified) return;
    
    try {
      setFormState(prev => ({ ...prev, isSubmitting: true }));
      
      // Validate before saving
      const isValid = await validateTab(table);
      if (!isValid) {
        throw new Error(`Validation failed for ${table}`);
      }
      
      let result;
      
      if (table === 'tokens') {
        // Handle main tokens table
        const tokenData = Array.isArray(tabData.data) ? tabData.data[0] : tabData.data;
        if (tokenId) {
          result = await tokenCRUDService.updateTokenData(tokenId, tokenData);
        } else {
          // For new tokens, we need to create first
          throw new Error('Cannot save token data without token ID');
        }
      } else {
        // Handle related tables
        if (!tokenId) {
          throw new Error('Cannot save related data without token ID');
        }
        
        const dataArray = Array.isArray(tabData.data) ? tabData.data : [tabData.data];
        result = await tokenCRUDService.updateTableData(table, tokenId, dataArray);
      }
      
      // Update state with saved data
      setFormState(prev => ({
        ...prev,
        tabs: {
          ...prev.tabs,
          [table]: {
            ...prev.tabs[table],
            isModified: false,
            data: result
          }
        },
        isSubmitting: false,
        lastSaved: new Date().toISOString()
      }));
      
      toast({
        title: "Saved Successfully",
        description: `${table} data has been saved`,
        variant: "default"
      });
      
    } catch (error) {
      console.error(`Error saving ${table}:`, error);
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        globalErrors: [...prev.globalErrors, `Failed to save ${table}: ${error.message}`]
      }));
      
      toast({
        title: "Save Error",
        description: `Failed to save ${table}: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [formState.tabs, tokenId, validateTab, toast]);

  const saveAll = useCallback(async (): Promise<void> => {
    const modifiedTabs = Object.entries(formState.tabs)
      .filter(([_, tab]) => tab.isModified)
      .map(([table, _]) => table);
    
    if (modifiedTabs.length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
        variant: "default"
      });
      return;
    }
    
    try {
      setFormState(prev => ({ ...prev, isSubmitting: true }));
      
      // Save in order: tokens first, then related tables
      const sortedTabs = modifiedTabs.sort((a, b) => {
        if (a === 'tokens') return -1;
        if (b === 'tokens') return 1;
        return 0;
      });
      
      for (const table of sortedTabs) {
        await saveTab(table);
      }
      
      toast({
        title: "All Saved",
        description: `Successfully saved all changes (${modifiedTabs.length} tables)`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error saving all:', error);
      toast({
        title: "Save Error",
        description: `Error occurred while saving: ${error.message}`,
        variant: "destructive"
      });
    }
  }, [formState.tabs, saveTab, toast]);

  const resetTab = useCallback((table: string) => {
    setFormState(prev => {
      const currentTab = prev.tabs[table];
      if (!currentTab) return prev;
      
      return {
        ...prev,
        tabs: {
          ...prev.tabs,
          [table]: {
            ...currentTab,
            isModified: false,
            hasErrors: false,
            validationErrors: {}
          }
        }
      };
    });
    
    // Reload data for this tab
    if (tokenId) {
      loadAllData();
    }
  }, [tokenId, loadAllData]);

  // Create event handlers object
  const eventHandlers: FormEventHandlers = {
    onTabChange: handleTabChange,
    onFieldChange: handleFieldChange,
    onSave: saveTab,
    onSaveAll: saveAll,
    onReset: resetTab,
    onValidate: validateTab
  };

  return {
    formState,
    projectId: formState.projectId, // 🆕 RETURN PROJECT ID
    eventHandlers,
    loadAllData,
    initializeEmptyForm,
    // Computed values
    hasUnsavedChanges: Object.values(formState.tabs).some(tab => tab.isModified),
    hasErrors: Object.values(formState.tabs).some(tab => tab.hasErrors),
    availableTables: tokenCRUDService.getTablesForStandard(standard)
  };
}

export default useComprehensiveTokenForm;
