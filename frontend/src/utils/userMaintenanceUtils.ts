import { userDeletionService } from '../services/auth/userDeletionService';

/**
 * Utility functions for user management cleanup and maintenance
 */
export class UserMaintenanceUtils {
  /**
   * Check for and report orphaned profiles
   */
  static async checkOrphanedProfiles(): Promise<{
    count: number;
    profiles: any[];
    recommendation: string;
  }> {
    try {
      const orphanedProfiles = await userDeletionService.checkForOrphanedProfiles();
      
      const result = {
        count: orphanedProfiles.length,
        profiles: orphanedProfiles,
        recommendation: orphanedProfiles.length > 0 
          ? `Found ${orphanedProfiles.length} orphaned profiles. Consider running cleanup to remove them.`
          : 'No orphaned profiles found. Database is clean.'
      };

      console.log('Orphaned Profile Check Results:', result);
      return result;
    } catch (error) {
      console.error('Error checking for orphaned profiles:', error);
      return {
        count: -1,
        profiles: [],
        recommendation: 'Error occurred while checking for orphaned profiles'
      };
    }
  }

  /**
   * Clean up all orphaned profiles
   */
  static async cleanupOrphanedProfiles(): Promise<{
    cleaned: number;
    success: boolean;
    message: string;
  }> {
    try {
      const cleanedCount = await userDeletionService.cleanupOrphanedProfiles();
      
      const result = {
        cleaned: cleanedCount,
        success: cleanedCount >= 0,
        message: cleanedCount > 0 
          ? `Successfully cleaned up ${cleanedCount} orphaned profiles`
          : 'No orphaned profiles found to clean up'
      };

      console.log('Cleanup Results:', result);
      return result;
    } catch (error) {
      console.error('Error during orphaned profile cleanup:', error);
      return {
        cleaned: 0,
        success: false,
        message: 'Error occurred during cleanup'
      };
    }
  }

  /**
   * Run a complete maintenance check and cleanup
   */
  static async runMaintenanceCheck(): Promise<{
    orphanedCheck: any;
    cleanup: any;
    summary: string;
  }> {
    console.log('Starting user maintenance check...');
    
    // First check for orphaned profiles
    const orphanedCheck = await this.checkOrphanedProfiles();
    
    // If orphaned profiles found, offer to clean them up
    let cleanup = null;
    if (orphanedCheck.count > 0) {
      console.log(`Found ${orphanedCheck.count} orphaned profiles. Running cleanup...`);
      cleanup = await this.cleanupOrphanedProfiles();
    }

    const summary = cleanup 
      ? `Maintenance complete. ${cleanup.cleaned} profiles cleaned up.`
      : orphanedCheck.count === 0 
        ? 'Maintenance complete. No issues found.'
        : 'Maintenance check complete. No cleanup performed.';

    const result = {
      orphanedCheck,
      cleanup,
      summary
    };

    console.log('Maintenance Check Summary:', result);
    return result;
  }
}

// Export a convenience function for quick access
export const runUserMaintenanceCheck = UserMaintenanceUtils.runMaintenanceCheck;
export const checkOrphanedProfiles = UserMaintenanceUtils.checkOrphanedProfiles;
export const cleanupOrphanedProfiles = UserMaintenanceUtils.cleanupOrphanedProfiles;
