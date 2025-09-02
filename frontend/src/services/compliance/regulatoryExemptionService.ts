import { supabase } from "@/infrastructure/database/client";
import type { 
  RegulatoryExemption, 
  CreateRegulatoryExemption, 
  UpdateRegulatoryExemption,
  RegulatoryExemptionFilters,
  RegulatoryExemptionsByRegion,
  RegulatoryExemptionStats,
  RegulatoryExemptionResponse,
  PaginatedRegulatoryExemptions,
  RegulatoryRegion,
  RegulatoryCountry
} from '@/types/domain/compliance/regulatory';

/**
 * Service for managing regulatory exemptions
 */
export class RegulatoryExemptionService {
  
  /**
   * Map database fields to interface format
   */
  private static mapDatabaseToInterface(dbRecord: any): RegulatoryExemption {
    return {
      id: dbRecord.id,
      region: dbRecord.region,
      country: dbRecord.country,
      exemptionType: dbRecord.exemption_type,
      explanation: dbRecord.explanation,
      createdAt: new Date(dbRecord.created_at),
      updatedAt: new Date(dbRecord.updated_at)
    };
  }
  
  /**
   * Map interface format to database fields
   */
  private static mapInterfaceToDatabase(interfaceData: CreateRegulatoryExemption | UpdateRegulatoryExemption): any {
    const result: any = {};
    
    if ('region' in interfaceData) result.region = interfaceData.region;
    if ('country' in interfaceData) result.country = interfaceData.country;
    if ('exemptionType' in interfaceData) result.exemption_type = interfaceData.exemptionType;
    if ('explanation' in interfaceData) result.explanation = interfaceData.explanation;
    
    return result;
  }
  
  /**
   * Get all regulatory exemptions with optional filtering
   */
  static async getRegulatoryExemptions(
    filters?: RegulatoryExemptionFilters
  ): Promise<RegulatoryExemptionResponse<RegulatoryExemption[]>> {
    try {
      let query = supabase
        .from('regulatory_exemptions')
        .select('*')
        .order('region', { ascending: true })
        .order('country', { ascending: true })
        .order('exemption_type', { ascending: true });

      // Apply filters
      if (filters?.region) {
        query = query.eq('region', filters.region);
      }
      
      if (filters?.country) {
        query = query.eq('country', filters.country);
      }
      
      if (filters?.search) {
        query = query.or(`exemption_type.ilike.%${filters.search}%,explanation.ilike.%${filters.search}%`);
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []).map(record => this.mapDatabaseToInterface(record))
      };
    } catch (error) {
      console.error('Error fetching regulatory exemptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get regulatory exemptions grouped by region
   */
  static async getRegulatoryExemptionsByRegion(): Promise<RegulatoryExemptionResponse<RegulatoryExemptionsByRegion[]>> {
    try {
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .select('*')
        .order('region', { ascending: true })
        .order('country', { ascending: true })
        .order('exemption_type', { ascending: true });

      if (error) {
        throw error;
      }

      // Group exemptions by region and country
      const groupedData: RegulatoryExemptionsByRegion[] = [];
      const regionMap = new Map<string, Map<string, RegulatoryExemption[]>>();

      (data || []).forEach(dbRecord => {
        const exemption = this.mapDatabaseToInterface(dbRecord);
        
        if (!regionMap.has(exemption.region)) {
          regionMap.set(exemption.region, new Map());
        }
        
        const countryMap = regionMap.get(exemption.region)!;
        if (!countryMap.has(exemption.country)) {
          countryMap.set(exemption.country, []);
        }
        
        countryMap.get(exemption.country)!.push(exemption);
      });

      regionMap.forEach((countryMap, region) => {
        const countries: { country: RegulatoryCountry; exemptions: RegulatoryExemption[] }[] = [];
        
        countryMap.forEach((exemptions, country) => {
          countries.push({
            country: country as RegulatoryCountry,
            exemptions
          });
        });

        groupedData.push({
          region: region as RegulatoryRegion,
          countries
        });
      });

      return {
        success: true,
        data: groupedData
      };
    } catch (error) {
      console.error('Error fetching grouped regulatory exemptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get regulatory exemption by ID
   */
  static async getRegulatoryExemptionById(id: string): Promise<RegulatoryExemptionResponse<RegulatoryExemption>> {
    try {
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToInterface(data)
      };
    } catch (error) {
      console.error('Error fetching regulatory exemption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get multiple regulatory exemptions by their IDs
   */
  static async getRegulatoryExemptionsByIds(ids: string[]): Promise<RegulatoryExemptionResponse<RegulatoryExemption[]>> {
    try {
      if (!ids || ids.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .select('*')
        .in('id', ids)
        .order('region', { ascending: true })
        .order('country', { ascending: true })
        .order('exemption_type', { ascending: true });

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []).map(record => this.mapDatabaseToInterface(record))
      };
    } catch (error) {
      console.error('Error fetching regulatory exemptions by IDs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Search regulatory exemptions
   */
  static async searchRegulatoryExemptions(
    query: string, 
    limit: number = 20
  ): Promise<RegulatoryExemptionResponse<RegulatoryExemption[]>> {
    try {
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .select('*')
        .or(`exemption_type.ilike.%${query}%,explanation.ilike.%${query}%`)
        .order('region', { ascending: true })
        .order('country', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: (data || []).map(record => this.mapDatabaseToInterface(record))
      };
    } catch (error) {
      console.error('Error searching regulatory exemptions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get regulatory exemption statistics
   */
  static async getRegulatoryExemptionStats(): Promise<RegulatoryExemptionResponse<RegulatoryExemptionStats>> {
    try {
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .select('region, country');

      if (error) {
        throw error;
      }

      const exemptions = data || [];
      const regionCounts = new Map<string, number>();
      const countryCounts = new Map<string, number>();

      exemptions.forEach(exemption => {
        regionCounts.set(exemption.region, (regionCounts.get(exemption.region) || 0) + 1);
        countryCounts.set(exemption.country, (countryCounts.get(exemption.country) || 0) + 1);
      });

      const stats: RegulatoryExemptionStats = {
        totalExemptions: exemptions.length,
        exemptionsByRegion: Array.from(regionCounts.entries()).map(([region, count]) => ({
          region: region as RegulatoryRegion,
          count
        })),
        exemptionsByCountry: Array.from(countryCounts.entries()).map(([country, count]) => ({
          country: country as RegulatoryCountry,
          count
        }))
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Error fetching regulatory exemption stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Create a new regulatory exemption (admin only)
   */
  static async createRegulatoryExemption(
    exemptionData: CreateRegulatoryExemption
  ): Promise<RegulatoryExemptionResponse<RegulatoryExemption>> {
    try {
      const dbData = this.mapInterfaceToDatabase(exemptionData);
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToInterface(data),
        message: 'Regulatory exemption created successfully'
      };
    } catch (error) {
      console.error('Error creating regulatory exemption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update a regulatory exemption (admin only)
   */
  static async updateRegulatoryExemption(
    id: string,
    updates: UpdateRegulatoryExemption
  ): Promise<RegulatoryExemptionResponse<RegulatoryExemption>> {
    try {
      const dbUpdates = this.mapInterfaceToDatabase(updates);
      const { data, error } = await supabase
        .from('regulatory_exemptions')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        data: this.mapDatabaseToInterface(data),
        message: 'Regulatory exemption updated successfully'
      };
    } catch (error) {
      console.error('Error updating regulatory exemption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete a regulatory exemption (admin only)
   */
  static async deleteRegulatoryExemption(id: string): Promise<RegulatoryExemptionResponse<void>> {
    try {
      const { error } = await supabase
        .from('regulatory_exemptions')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return {
        success: true,
        message: 'Regulatory exemption deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting regulatory exemption:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}
