import { recsService } from './recsService';
import { incentivesService } from './incentivesService';
import { RECIncentiveOrchestrator } from '@/services/climateReceivables/rec-incentive-orchestrator';
import { 
  RenewableEnergyCredit, 
  InsertRenewableEnergyCredit, 
  ClimateIncentive,
  InsertClimateIncentive 
} from '../types';

/**
 * Enhanced REC Service with Incentive Synchronization
 * 
 * This service extends the basic recsService with automatic incentive synchronization.
 * Use this service instead of recsService directly when you need REC-incentive coordination.
 */
export const enhancedRECService = {
  orchestrator: RECIncentiveOrchestrator.getInstance(),

  /**
   * Create a new REC with automatic incentive creation
   * @param rec REC data to create
   * @param projectId Project ID for linking
   * @returns Created REC with its linked incentive
   */
  async createWithIncentive(
    rec: InsertRenewableEnergyCredit,
    projectId: string
  ): Promise<{ rec: RenewableEnergyCredit; incentive: ClimateIncentive }> {
    const result = await this.orchestrator.createRECWithIncentive(rec, projectId);
    
    if (!result.success) {
      throw new Error(`Failed to create REC with incentive: ${result.errors?.join(', ')}`);
    }

    return { 
      rec: result.rec!, 
      incentive: result.incentive! 
    };
  },

  /**
   * Update a REC with automatic incentive synchronization
   * @param id REC ID to update
   * @param updates REC updates
   * @returns Updated REC with synchronized incentive
   */
  async updateWithIncentive(
    id: string,
    updates: Partial<InsertRenewableEnergyCredit>
  ): Promise<{ rec: RenewableEnergyCredit; incentive?: ClimateIncentive }> {
    const result = await this.orchestrator.updateRECWithIncentive(id, updates);
    
    if (!result.success) {
      throw new Error(`Failed to update REC with incentive: ${result.errors?.join(', ')}`);
    }

    return { 
      rec: result.rec!, 
      incentive: result.incentive 
    };
  },

  /**
   * Delete a REC with automatic incentive cleanup
   * @param id REC ID to delete
   * @returns Deletion success status
   */
  async deleteWithIncentive(id: string): Promise<boolean> {
    const result = await this.orchestrator.deleteRECWithIncentive(id);
    
    if (!result.success) {
      throw new Error(`Failed to delete REC with incentive: ${result.errors?.join(', ')}`);
    }

    return result.success;
  },

  /**
   * Get all RECs with their synchronized incentive data by project
   * @param projectId Project ID to filter by
   * @returns Array of REC-incentive pairs
   */
  async getAllWithIncentivesByProject(projectId: string) {
    return await this.orchestrator.getAllRECIncentiveMappings(projectId);
  },

  // Delegate standard operations to base service
  async getAll(...args: Parameters<typeof recsService.getAll>) {
    return await recsService.getAll(...args);
  },

  async getById(id: string) {
    return await recsService.getById(id);
  },

  async getRECsSummary() {
    return await recsService.getRECsSummary();
  },

  async getVintageDistribution() {
    return await recsService.getVintageDistribution();
  },

  // Direct access to base service for when sync is not needed
  base: recsService
};

/**
 * Enhanced Incentive Service with REC Synchronization
 * 
 * This service extends the basic incentivesService with automatic REC linking.
 */
export const enhancedIncentiveService = {
  orchestrator: RECIncentiveOrchestrator.getInstance(),

  /**
   * Create an incentive with optional REC linking
   * @param incentive Incentive data to create
   * @param linkToRECId Optional REC ID to link
   * @returns Created incentive with linked REC (if applicable)
   */
  async createWithRECLink(
    incentive: InsertClimateIncentive,
    linkToRECId?: string
  ): Promise<{ incentive: ClimateIncentive; rec?: RenewableEnergyCredit }> {
    const result = await this.orchestrator.createIncentiveWithRECLink(incentive, linkToRECId);
    
    if (!result.success) {
      throw new Error(`Failed to create incentive with REC link: ${result.errors?.join(', ')}`);
    }

    return { 
      incentive: result.incentive!, 
      rec: result.rec 
    };
  },

  // Delegate standard operations to base service
  async getAll(...args: Parameters<typeof incentivesService.getAll>) {
    return await incentivesService.getAll(...args);
  },

  async getById(id: string) {
    return await incentivesService.getById(id);
  },

  async create(incentive: InsertClimateIncentive) {
    return await incentivesService.create(incentive);
  },

  async update(id: string, updates: Partial<InsertClimateIncentive>) {
    return await incentivesService.update(id, updates);
  },

  async delete(id: string) {
    return await incentivesService.delete(id);
  },

  async getIncentivesSummary() {
    return await incentivesService.getIncentivesSummary();
  },

  // Direct access to base service
  base: incentivesService
};
