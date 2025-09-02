// =====================================================
// SIDEBAR ORDERING UTILITY
// Utility functions to debug and fix sidebar ordering issues
// Created: August 28, 2025
// =====================================================

import { supabase } from '@/infrastructure/database/client';

export interface SectionOrderUpdate {
  title: string;
  displayOrder: number;
}

export class SidebarOrderingUtility {
  /**
   * Debug current sidebar configuration ordering
   */
  public static async debugSidebarOrdering(configurationName?: string): Promise<void> {
    try {
      const query = supabase
        .from('sidebar_configurations')
        .select('id, name, configuration_data')
        .eq('is_active', true);
      
      if (configurationName) {
        query.eq('name', configurationName);
      }

      const { data: configurations, error } = await query;

      if (error) {
        console.error('Error fetching configurations:', error);
        return;
      }

      if (!configurations || configurations.length === 0) {
        console.log('No active configurations found');
        return;
      }

      configurations.forEach(config => {
        console.group(`Configuration: ${config.name}`);
        
        const sections = config.configuration_data?.sections || [];
        console.log(`Total sections: ${sections.length}`);
        
        sections.forEach((section: any, index: number) => {
          console.log(`Section ${index + 1}:`, {
            title: section.title,
            displayOrder: section.displayOrder,
            itemsCount: section.items?.length || 0
          });
          
          // Log first few items for each section
          if (section.items && section.items.length > 0) {
            const itemsToShow = section.items.slice(0, 3);
            itemsToShow.forEach((item: any, itemIndex: number) => {
              console.log(`  Item ${itemIndex + 1}:`, {
                label: item.label,
                displayOrder: item.displayOrder
              });
            });
            
            if (section.items.length > 3) {
              console.log(`  ... and ${section.items.length - 3} more items`);
            }
          }
        });
        
        console.groupEnd();
      });
      
    } catch (error) {
      console.error('Error in debugSidebarOrdering:', error);
    }
  }

  /**
   * Update section ordering for a configuration
   */
  public static async updateSectionOrdering(
    configurationName: string, 
    sectionOrders: SectionOrderUpdate[]
  ): Promise<boolean> {
    try {
      console.log(`Updating section ordering for: ${configurationName}`);
      
      // Get the configuration
      const { data: config, error: fetchError } = await supabase
        .from('sidebar_configurations')
        .select('id, configuration_data')
        .eq('name', configurationName)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching configuration:', fetchError);
        return false;
      }

      if (!config) {
        console.error('Configuration not found:', configurationName);
        return false;
      }

      // Update sections with new display orders
      const sections = config.configuration_data?.sections || [];
      const updatedSections = sections.map((section: any) => {
        const orderUpdate = sectionOrders.find(order => order.title === section.title);
        if (orderUpdate) {
          console.log(`Updating ${section.title}: ${section.displayOrder} → ${orderUpdate.displayOrder}`);
          return {
            ...section,
            displayOrder: orderUpdate.displayOrder
          };
        }
        return section;
      });

      // Sort sections by displayOrder to ensure consistent ordering
      updatedSections.sort((a: any, b: any) => (a.displayOrder || 999) - (b.displayOrder || 999));

      // Update the configuration in database
      const { error: updateError } = await supabase
        .from('sidebar_configurations')
        .update({
          configuration_data: {
            ...config.configuration_data,
            sections: updatedSections
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', config.id);

      if (updateError) {
        console.error('Error updating configuration:', updateError);
        return false;
      }

      console.log('Section ordering updated successfully');
      
      // Trigger a sidebar refresh event
      window.dispatchEvent(new CustomEvent('sidebarConfigurationUpdated'));
      
      return true;
      
    } catch (error) {
      console.error('Error in updateSectionOrdering:', error);
      return false;
    }
  }

  /**
   * Apply standard section ordering to a configuration
   */
  public static async applyStandardOrdering(configurationName: string = 'Super Admin Default'): Promise<boolean> {
    const standardOrder: SectionOrderUpdate[] = [
      { title: 'OVERVIEW', displayOrder: 0 },
      { title: 'ONBOARDING', displayOrder: 10 },
      { title: 'ISSUANCE', displayOrder: 20 },
      { title: 'FACTORING', displayOrder: 30 },
      { title: 'CLIMATE RECEIVABLES', displayOrder: 40 },
      { title: 'COMPLIANCE', displayOrder: 50 },
      { title: 'WALLET MANAGEMENT', displayOrder: 60 },
      { title: 'ADMINISTRATION', displayOrder: 100 }
    ];

    return this.updateSectionOrdering(configurationName, standardOrder);
  }

  /**
   * Clear sidebar cache and trigger refresh
   */
  public static refreshSidebar(): void {
    // Clear any cached data
    localStorage.removeItem('sidebarCache');
    sessionStorage.removeItem('sidebarCache');
    
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('sidebarConfigurationUpdated'));
    
    console.log('Sidebar refresh triggered');
  }
}

// Expose utility functions to window for easy debugging in console
declare global {
  interface Window {
    debugSidebar: () => Promise<void>;
    fixSidebarOrdering: () => Promise<boolean>;
    refreshSidebar: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.debugSidebar = () => SidebarOrderingUtility.debugSidebarOrdering();
  window.fixSidebarOrdering = () => SidebarOrderingUtility.applyStandardOrdering();
  window.refreshSidebar = () => SidebarOrderingUtility.refreshSidebar();
}

export default SidebarOrderingUtility;
