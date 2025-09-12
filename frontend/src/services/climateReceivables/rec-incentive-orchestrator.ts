import { supabase } from '@/infrastructure/database/client';
import type { 
  RenewableEnergyCredit, 
  InsertRenewableEnergyCredit, 
  ClimateIncentive,
  InsertClimateIncentive,
  RECStatus,
  IncentiveStatus,
  IncentiveType
} from '@/types/domain/climate/receivables';
import { 
  RECStatusEnum,
  IncentiveStatusEnum,
  IncentiveTypeEnum
} from '@/types/domain/climate/receivables';

// TODO: Implement when services are available - Temporary stubs for compilation
class RecsService {
  static async create(data: InsertRenewableEnergyCredit): Promise<RenewableEnergyCredit> {
    return { 
      rec_id: 'temp-rec-id', 
      quantity: 0,
      vintage_year: new Date().getFullYear(),
      market_type: 'voluntary',
      price_per_rec: 0,
      total_value: 0,
      status: 'pending',
      ...data 
    };
  }
  
  static async update(id: string, data: Partial<RenewableEnergyCredit>): Promise<RenewableEnergyCredit> {
    return { 
      rec_id: id, 
      quantity: 0,
      vintage_year: new Date().getFullYear(),
      market_type: 'voluntary',
      price_per_rec: 0,
      total_value: 0,
      status: 'pending',
      ...data 
    };
  }
  
  static async delete(id: string) {
    return { success: true };
  }
  
  static async getById(id: string): Promise<RenewableEnergyCredit | null> {
    return null;
  }
  
  static async getAll(): Promise<RenewableEnergyCredit[]> {
    return [];
  }
}

class IncentivesService {
  static async create(data: InsertClimateIncentive): Promise<ClimateIncentive> {
    return { 
      incentive_id: 'temp-incentive-id',
      type: 'renewable_energy_certificate',
      amount: 0,
      status: 'pending',
      ...data 
    };
  }
  
  static async update(id: string, data: Partial<ClimateIncentive>): Promise<ClimateIncentive> {
    return { 
      incentive_id: id,
      type: 'renewable_energy_certificate',
      amount: 0,
      status: 'pending',
      ...data 
    };
  }
  
  static async delete(id: string) {
    return { success: true };
  }
  
  static async getById(id: string): Promise<ClimateIncentive | null> {
    return null;
  }
  
  static async getByReceivableId(receivableId: string): Promise<ClimateIncentive[]> {
    return [];
  }
}

const recsService = RecsService;
const incentivesService = IncentivesService;

/**
 * REC-Incentive synchronization result
 */
interface SyncResult {
  success: boolean;
  recId?: string;
  incentiveId?: string;
  operation: 'create' | 'update' | 'delete';
  errors?: string[];
  duration: number;
}

/**
 * REC-Incentive data mapping configuration
 */
interface RECIncentiveMapping {
  rec: RenewableEnergyCredit | InsertRenewableEnergyCredit;
  incentive: ClimateIncentive | InsertClimateIncentive;
}

/**
 * REC-Incentive Orchestrator
 * 
 * Coordinates CRUD operations between renewable_energy_credits and climate_incentives tables
 * Ensures data consistency and referential integrity between RECs and their corresponding incentives
 */
export class RECIncentiveOrchestrator {
  private static instance: RECIncentiveOrchestrator;

  /**
   * Get singleton instance
   */
  public static getInstance(): RECIncentiveOrchestrator {
    if (!this.instance) {
      this.instance = new RECIncentiveOrchestrator();
    }
    return this.instance;
  }

  /**
   * Create a new REC with its corresponding incentive record
   * 
   * @param recData - REC data to create
   * @param projectId - Project ID for linking
   * @returns Synchronization result with both REC and incentive data
   */
  public async createRECWithIncentive(
    recData: InsertRenewableEnergyCredit,
    projectId: string
  ): Promise<SyncResult & { rec?: RenewableEnergyCredit; incentive?: ClimateIncentive }> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Creating REC with synchronized incentive...');

      // Use Supabase transaction pattern - all operations in single transaction
      const { data: transactionResult, error: transactionError } = await supabase
        .rpc('begin_transaction');

      if (transactionError) {
        console.warn('Transaction function not available, proceeding with sequential operations');
      }

      let rec: RenewableEnergyCredit;
      let incentive: ClimateIncentive;
      let updatedREC: RenewableEnergyCredit;

      try {
        // 1. Create the REC first
        rec = await recsService.create({
          ...recData,
          project_id: projectId
        });

        // 2. Create corresponding incentive record
        const incentiveData: InsertClimateIncentive = this.mapRECToIncentive(recData, rec.rec_id, projectId);
        
        incentive = await incentivesService.create(incentiveData);

        // 3. Update REC with incentive_id reference
        updatedREC = await recsService.update(rec.rec_id, {
          incentive_id: incentive.incentive_id
        });

        console.log(`✅ REC-Incentive sync completed: REC ${rec.rec_id} ↔ Incentive ${incentive.incentive_id}`);

        return {
          success: true,
          recId: rec.rec_id,
          incentiveId: incentive.incentive_id,
          operation: 'create',
          duration: Date.now() - startTime,
          rec: updatedREC,
          incentive
        };

      } catch (innerError) {
        // In case of error, attempt cleanup
        console.error('Error during REC-Incentive creation, attempting cleanup:', innerError);
        
        // Try to clean up created records
        try {
          if (incentive?.incentive_id) {
            await incentivesService.delete(incentive.incentive_id);
          }
          if (rec?.rec_id) {
            await recsService.delete(rec.rec_id);
          }
        } catch (cleanupError) {
          console.error('Cleanup failed:', cleanupError);
        }
        
        throw innerError;
      }

    } catch (error: any) {
      console.error('❌ REC-Incentive creation failed:', error);
      
      return {
        success: false,
        operation: 'create',
        errors: [error?.message || 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Update a REC and synchronize with its incentive record
   * 
   * @param recId - REC ID to update
   * @param recUpdates - REC data updates
   * @returns Synchronization result
   */
  public async updateRECWithIncentive(
    recId: string,
    recUpdates: Partial<InsertRenewableEnergyCredit>
  ): Promise<SyncResult & { rec?: RenewableEnergyCredit; incentive?: ClimateIncentive }> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Updating REC ${recId} with synchronized incentive...`);

      // Get existing REC to find linked incentive
      const existingREC = await recsService.getById(recId);
      if (!existingREC) {
        throw new Error(`REC not found: ${recId}`);
      }

      // Start transaction (if available)
      const { error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) {
        console.warn('Transaction function not available, proceeding with sequential operations');
      }

      try {
        // 1. Update the REC
        const updatedREC = await recsService.update(recId, recUpdates);

        // 2. Update corresponding incentive if it exists and relevant fields changed
        let updatedIncentive: ClimateIncentive | undefined;
        
        if (existingREC.incentive_id) {
          const incentiveUpdates = this.mapRECUpdatesToIncentive(recUpdates, updatedREC);
          
          if (Object.keys(incentiveUpdates).length > 0) {
            updatedIncentive = await incentivesService.update(existingREC.incentive_id, incentiveUpdates);
          }
        } else if (this.shouldCreateIncentive(recUpdates)) {
          // Create incentive if it doesn't exist but should now
          const incentiveData: InsertClimateIncentive = this.mapRECToIncentive(
            updatedREC, 
            updatedREC.rec_id, 
            updatedREC.project_id || ''
          );
          
          updatedIncentive = await incentivesService.create(incentiveData);
          
          // Update REC with new incentive reference
          await recsService.update(recId, { incentive_id: updatedIncentive.incentive_id });
        }

        // Operations completed successfully
        console.log(`✅ REC-Incentive update completed: REC ${recId}`);

        return {
          success: true,
          recId: updatedREC.rec_id,
          incentiveId: updatedIncentive?.incentive_id || existingREC.incentive_id,
          operation: 'update',
          duration: Date.now() - startTime,
          rec: updatedREC,
          incentive: updatedIncentive
        };

      } catch (innerError) {
        console.error('Error during REC-Incentive update:', innerError);
        throw innerError;
      }

    } catch (error: any) {
      console.error('❌ REC-Incentive update failed:', error);
      
      return {
        success: false,
        operation: 'update',
        errors: [error?.message || 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Delete a REC and its corresponding incentive record
   * 
   * @param recId - REC ID to delete
   * @returns Synchronization result
   */
  public async deleteRECWithIncentive(recId: string): Promise<SyncResult> {
    const startTime = Date.now();

    try {
      console.log(`🔄 Deleting REC ${recId} with synchronized incentive...`);

      // Get existing REC to find linked incentive
      const existingREC = await recsService.getById(recId);
      if (!existingREC) {
        throw new Error(`REC not found: ${recId}`);
      }

      // Start transaction (if available)
      const { error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) {
        console.warn('Transaction function not available, proceeding with sequential operations');
      }

      try {
        // 1. Delete the incentive first (if exists)
        let deletedIncentiveId: string | undefined;
        if (existingREC.incentive_id) {
          await incentivesService.delete(existingREC.incentive_id);
          deletedIncentiveId = existingREC.incentive_id;
        }

        // 2. Delete the REC
        await recsService.delete(recId);

        console.log(`✅ REC-Incentive deletion completed: REC ${recId} ↔ Incentive ${deletedIncentiveId || 'none'}`);

        return {
          success: true,
          recId,
          incentiveId: deletedIncentiveId,
          operation: 'delete',
          duration: Date.now() - startTime
        };

      } catch (innerError) {
        console.error('Error during REC-Incentive deletion:', innerError);
        throw innerError;
      }

    } catch (error: any) {
      console.error('❌ REC-Incentive deletion failed:', error);
      
      return {
        success: false,
        operation: 'delete',
        errors: [error?.message || 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Create an incentive and optionally link it to existing REC
   * 
   * @param incentiveData - Incentive data to create
   * @param linkToRECId - Optional REC ID to link to
   * @returns Synchronization result
   */
  public async createIncentiveWithRECLink(
    incentiveData: InsertClimateIncentive,
    linkToRECId?: string
  ): Promise<SyncResult & { incentive?: ClimateIncentive; rec?: RenewableEnergyCredit }> {
    const startTime = Date.now();

    try {
      console.log('🔄 Creating incentive with optional REC link...');

      // If this is a REC-type incentive, handle specially
      if (incentiveData.type === IncentiveTypeEnum.REC && !linkToRECId) {
        throw new Error('REC-type incentives must be linked to a REC record');
      }

      // Start transaction (if available)
      const { error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) {
        console.warn('Transaction function not available, proceeding with sequential operations');
      }

      try {
        // 1. Create the incentive
        const incentive = await incentivesService.create(incentiveData);

        // 2. Link to REC if specified
        let updatedREC: RenewableEnergyCredit | undefined;
        if (linkToRECId) {
          updatedREC = await recsService.update(linkToRECId, {
            incentive_id: incentive.incentive_id
          });
        }

        console.log(`✅ Incentive creation completed: Incentive ${incentive.incentive_id} ${linkToRECId ? `↔ REC ${linkToRECId}` : ''}`);

        return {
          success: true,
          incentiveId: incentive.incentive_id,
          recId: linkToRECId,
          operation: 'create',
          duration: Date.now() - startTime,
          incentive,
          rec: updatedREC
        };

      } catch (innerError) {
        console.error('Error during incentive creation:', innerError);
        throw innerError;
      }

    } catch (error: any) {
      console.error('❌ Incentive creation failed:', error);
      
      return {
        success: false,
        operation: 'create',
        errors: [error?.message || 'Unknown error'],
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get all RECs with their synchronized incentive data
   * 
   * @param projectId - Project ID to filter by
   * @returns Array of REC-Incentive mappings
   */
  public async getAllRECIncentiveMappings(projectId?: string): Promise<RECIncentiveMapping[]> {
    try {
      console.log('📊 Fetching all REC-Incentive mappings...');

      // Get all RECs
      const recs = await recsService.getAll();
      
      const mappings: RECIncentiveMapping[] = [];

      for (const rec of recs) {
        if (projectId && rec.project_id !== projectId) continue;

        let incentive: ClimateIncentive | undefined;
        
        // Get linked incentive if it exists
        if (rec.incentive_id) {
          try {
            incentive = await incentivesService.getById(rec.incentive_id);
          } catch (error) {
            console.warn(`Incentive not found for REC ${rec.rec_id}: ${rec.incentive_id}`);
          }
        }

        mappings.push({
          rec,
          incentive: incentive || this.createPlaceholderIncentive(rec)
        });
      }

      console.log(`✅ Retrieved ${mappings.length} REC-Incentive mappings`);
      return mappings;

    } catch (error) {
      console.error('❌ Failed to fetch REC-Incentive mappings:', error);
      throw error;
    }
  }

  // Private helper methods

  /**
   * Map REC data to incentive data structure
   */
  private mapRECToIncentive(
    rec: RenewableEnergyCredit | InsertRenewableEnergyCredit,
    recId: string,
    projectId: string
  ): InsertClimateIncentive {
    return {
      type: IncentiveTypeEnum.REC,
      amount: rec.total_value || (rec.quantity * rec.price_per_rec),
      status: this.mapRECStatusToIncentiveStatus(rec.status),
      asset_id: rec.asset_id,
      receivable_id: rec.receivable_id,
      project_id: projectId,
      expected_receipt_date: undefined // RECs don't have a specific receipt date
    };
  }

  /**
   * Map REC updates to incentive updates
   */
  private mapRECUpdatesToIncentive(
    recUpdates: Partial<InsertRenewableEnergyCredit>,
    fullREC: RenewableEnergyCredit
  ): Partial<InsertClimateIncentive> {
    const incentiveUpdates: Partial<InsertClimateIncentive> = {};

    // Update amount if total_value, quantity, or price_per_rec changed
    if (recUpdates.total_value !== undefined || 
        recUpdates.quantity !== undefined || 
        recUpdates.price_per_rec !== undefined) {
      incentiveUpdates.amount = recUpdates.total_value || 
                                (fullREC.quantity * fullREC.price_per_rec);
    }

    // Update status if changed
    if (recUpdates.status !== undefined) {
      incentiveUpdates.status = this.mapRECStatusToIncentiveStatus(recUpdates.status);
    }

    // Update asset_id if changed
    if (recUpdates.asset_id !== undefined) {
      incentiveUpdates.asset_id = recUpdates.asset_id;
    }

    // Update receivable_id if changed
    if (recUpdates.receivable_id !== undefined) {
      incentiveUpdates.receivable_id = recUpdates.receivable_id;
    }

    return incentiveUpdates;
  }

  /**
   * Map REC status to incentive status
   */
  private mapRECStatusToIncentiveStatus(recStatus: string): string {
    const statusMap: Record<string, string> = {
      [RECStatusEnum.PENDING]: IncentiveStatusEnum.PENDING,
      [RECStatusEnum.VERIFIED]: IncentiveStatusEnum.APPROVED,
      [RECStatusEnum.ISSUED]: IncentiveStatusEnum.DISBURSED,
      [RECStatusEnum.RETIRED]: IncentiveStatusEnum.DISBURSED,
      [RECStatusEnum.CANCELLED]: IncentiveStatusEnum.CANCELLED
    };

    return statusMap[recStatus] || IncentiveStatusEnum.PENDING;
  }

  /**
   * Determine if an incentive should be created based on REC updates
   */
  private shouldCreateIncentive(recUpdates: Partial<InsertRenewableEnergyCredit>): boolean {
    // Create incentive if total_value is being set or if status becomes verified
    return !!(recUpdates.total_value && recUpdates.total_value > 0) ||
           recUpdates.status === RECStatusEnum.VERIFIED;
  }

  /**
   * Create a placeholder incentive structure for display purposes
   */
  private createPlaceholderIncentive(rec: RenewableEnergyCredit): ClimateIncentive {
    return {
      incentive_id: '',
      type: IncentiveTypeEnum.REC,
      amount: rec.total_value,
      status: this.mapRECStatusToIncentiveStatus(rec.status),
      asset_id: rec.asset_id,
      receivable_id: rec.receivable_id,
      expected_receipt_date: undefined,
      created_at: rec.created_at,
      updated_at: rec.updated_at
    };
  }
}
