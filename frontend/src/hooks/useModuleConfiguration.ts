import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/infrastructure/database/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  ExtensionModuleConfigs, 
  getDefaultModuleConfigs 
} from '@/components/tokens/components/ExtensionModulesSection';

/**
 * Hook to manage module configurations for a token
 * 
 * Automatically loads configurations from database based on token standard
 * and provides methods to update configurations.
 * 
 * @param tokenId - Token ID to load configurations for
 * @returns Object containing module configs, update function, and loading state
 * 
 * @example
 * ```tsx
 * const { moduleConfigs, updateModuleConfig, isLoading } = useModuleConfiguration(tokenId);
 * 
 * // Update a specific module config
 * updateModuleConfig('fees', { enabled: true, transferFeeBps: 100 });
 * ```
 */
export const useModuleConfiguration = (tokenId: string) => {
  const { toast } = useToast();
  
  const [moduleConfigs, setModuleConfigs] = useState<ExtensionModuleConfigs>(
    getDefaultModuleConfigs()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load module configurations from database
  useEffect(() => {
    const loadModuleConfigurations = async () => {
      if (!tokenId) {
        console.warn('[useModuleConfiguration] No tokenId provided');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('[useModuleConfiguration] Loading configurations for token:', tokenId);
        
        // First, get the token to determine its standard
        const { data: token, error: tokenError } = await supabase
          .from('tokens')
          .select('standard')
          .eq('id', tokenId)
          .single();
        
        if (tokenError) {
          console.error('[useModuleConfiguration] Error fetching token:', tokenError);
          setError('Failed to load token information');
          return;
        }
        
        if (!token) {
          console.warn('[useModuleConfiguration] Token not found:', tokenId);
          setError('Token not found');
          return;
        }
        
        const standard = token.standard;
        console.log('[useModuleConfiguration] Token standard:', standard);
        
        // Determine the properties table based on standard
        const standardCode = standard.toLowerCase().replace('-', '');
        const propertiesTable = `token_${standardCode}_properties`;
        console.log('[useModuleConfiguration] Loading from table:', propertiesTable);
        
        // Load properties based on standard
        const { data: properties, error: propsError } = await supabase
          .from(propertiesTable)
          .select('*')
          .eq('token_id', tokenId)
          .single();
        
        if (propsError) {
          // If no properties exist yet, that's OK - use defaults
          if (propsError.code === 'PGRST116') {
            console.log('[useModuleConfiguration] No properties found, using defaults');
            setModuleConfigs(getDefaultModuleConfigs());
            return;
          }
          
          console.error(`[useModuleConfiguration] Error fetching ${propertiesTable}:`, propsError);
          setError('Failed to load module configurations');
          return;
        }
        
        if (!properties) {
          console.log('[useModuleConfiguration] No properties found, using defaults');
          setModuleConfigs(getDefaultModuleConfigs());
          return;
        }
        
        console.log('[useModuleConfiguration] Loaded properties:', properties);
        
        // Map database fields to ExtensionModuleConfigs interface
        const loadedConfigs: ExtensionModuleConfigs = {
          // Universal modules
          compliance: properties.compliance_config 
            ? { ...properties.compliance_config, enabled: !!properties.compliance_config.enabled } 
            : getDefaultModuleConfigs().compliance,
          
          vesting: properties.vesting_config 
            ? { ...properties.vesting_config, enabled: properties.vesting_enabled || !!properties.vesting_config.enabled } 
            : getDefaultModuleConfigs().vesting,
          
          document: properties.document_config 
            ? { ...properties.document_config, enabled: !!properties.document_config.enabled } 
            : getDefaultModuleConfigs().document,
          
          policyEngine: properties.policy_engine_config 
            ? { ...properties.policy_engine_config, enabled: !!properties.policy_engine_config.enabled } 
            : getDefaultModuleConfigs().policyEngine,
          
          // ERC20 modules
          fees: properties.fees_config 
            ? { ...properties.fees_config, enabled: !!properties.fees_config.enabled } 
            : properties.fee_on_transfer 
            ? { ...properties.fee_on_transfer, enabled: !!properties.fee_on_transfer.enabled }
            : getDefaultModuleConfigs().fees,
          
          flashMint: properties.flash_mint_config 
            ? { ...properties.flash_mint_config } 
            : { enabled: !!properties.flash_mint },
          
          permit: properties.permit_config 
            ? { ...properties.permit_config } 
            : { enabled: !!properties.permit },
          
          snapshot: properties.snapshot_config 
            ? { ...properties.snapshot_config } 
            : { enabled: !!properties.snapshot, automaticSnapshots: false, snapshotInterval: 0 },
          
          timelock: properties.timelock_config 
            ? { ...properties.timelock_config } 
            : getDefaultModuleConfigs().timelock,
          
          votes: properties.votes_config 
            ? { ...properties.votes_config } 
            : { enabled: properties.governance_enabled || false },
          
          payableToken: properties.payable_token_config 
            ? { ...properties.payable_token_config } 
            : { enabled: false },
          
          temporaryApproval: properties.temporary_approval_config 
            ? { ...properties.temporary_approval_config } 
            : getDefaultModuleConfigs().temporaryApproval,
        };
        
        console.log('[useModuleConfiguration] Loaded module configurations:', loadedConfigs);
        console.log('[useModuleConfiguration] Enabled modules:', 
          Object.entries(loadedConfigs)
            .filter(([_, config]) => (config as any)?.enabled)
            .map(([key]) => key)
        );
        
        setModuleConfigs(loadedConfigs);
        
        toast({
          title: "Module Configurations Loaded",
          description: `Loaded configurations for ${Object.values(loadedConfigs).filter((c: any) => c?.enabled).length} enabled modules`,
          variant: "default",
        });
        
      } catch (err) {
        console.error('[useModuleConfiguration] Unexpected error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configurations');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModuleConfigurations();
  }, [tokenId, toast]);
  
  // Update a specific module configuration
  const updateModuleConfig = useCallback(<K extends keyof ExtensionModuleConfigs>(
    moduleKey: K,
    config: ExtensionModuleConfigs[K]
  ) => {
    console.log('[useModuleConfiguration] Updating config for:', moduleKey, config);
    setModuleConfigs(prev => ({
      ...prev,
      [moduleKey]: config
    }));
  }, []);
  
  // Update multiple module configurations at once
  const updateModuleConfigs = useCallback((configs: Partial<ExtensionModuleConfigs>) => {
    console.log('[useModuleConfiguration] Updating multiple configs:', Object.keys(configs));
    setModuleConfigs(prev => ({
      ...prev,
      ...configs
    }));
  }, []);
  
  return {
    moduleConfigs,
    updateModuleConfig,
    updateModuleConfigs,
    isLoading,
    error
  };
};
