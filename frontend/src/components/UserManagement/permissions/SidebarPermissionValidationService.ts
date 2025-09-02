/**
 * =====================================================
 * SIDEBAR PERMISSION VALIDATION SERVICE
 * Enhanced permission validation to replace fallback logic
 * Date: August 28, 2025
 * =====================================================
 */

import type { UserContext } from '@/types/sidebar';

export interface PermissionValidationResult {
  isValid: boolean;
  matchedPermissions: string[];
  missingPermissions: string[];
  reason?: string;
}

export interface ModulePermissions {
  [moduleKey: string]: {
    requiredPermissions: string[];
    alternativePermissions?: string[];
    minRolePriority?: number;
    description: string;
  };
}

export class SidebarPermissionValidationService {
  private static instance: SidebarPermissionValidationService;

  public static getInstance(): SidebarPermissionValidationService {
    if (!SidebarPermissionValidationService.instance) {
      SidebarPermissionValidationService.instance = new SidebarPermissionValidationService();
    }
    return SidebarPermissionValidationService.instance;
  }

  /**
   * Complete module permission mappings based on configuration
   */
  private readonly modulePermissions: ModulePermissions = {
    // OVERVIEW SECTION
    'dashboard': {
      requiredPermissions: ['dashboard.view'],
      alternativePermissions: [], // Dashboard should be universally accessible
      minRolePriority: 50,
      description: 'Dashboard access'
    },
    'projects': {
      requiredPermissions: ['projects.view'],
      alternativePermissions: ['project.view'],
      minRolePriority: 50,
      description: 'Projects listing and management'
    },

    // ONBOARDING SECTION  
    'investor-onboarding': {
      requiredPermissions: ['compliance_kyc_kyb.view', 'compliance_kyc_kyb.create', 'investor.create'],
      minRolePriority: 60,
      description: 'Investor onboarding process'
    },
    'issuer-onboarding': {
      requiredPermissions: ['compliance_kyc_kyb.view', 'compliance_kyc_kyb.create', 'user.create'],
      minRolePriority: 60,
      description: 'Issuer onboarding process'
    },

    // ISSUANCE SECTION
    'token-management': {
      requiredPermissions: ['token_design.view', 'token_lifecycle.view'],
      minRolePriority: 60,
      description: 'Token design and lifecycle management'
    },
    'cap-table': {
      requiredPermissions: ['token_allocations.view', 'investor.view'],
      minRolePriority: 60,
      description: 'Cap table and investor allocations'
    },
    'redemptions': {
      requiredPermissions: ['redemptions.view', 'redemptions.create'],
      minRolePriority: 60,
      description: 'Token redemption management'
    },

    // FACTORING SECTION
    'factoring-dashboard': {
      requiredPermissions: ['invoice.view', 'dashboard.view'],
      minRolePriority: 70,
      description: 'Factoring dashboard overview'
    },
    'invoices': {
      requiredPermissions: ['invoice.view', 'invoice.create'],
      minRolePriority: 70,
      description: 'Invoice management for factoring'
    },
    'pools-tranches': {
      requiredPermissions: ['pool.view', 'tranche.view'],
      minRolePriority: 70,
      description: 'Pool and tranche management'
    },
    'tokenize-pools': {
      requiredPermissions: ['tokenization.create', 'tokenization.view'],
      minRolePriority: 70,
      description: 'Pool tokenization capabilities'
    },
    'factoring-distribution': {
      requiredPermissions: ['distribution.view', 'transactions.bulk_distribute'],
      minRolePriority: 70,
      description: 'Distribution management for factoring'
    },

    // CLIMATE RECEIVABLES SECTION
    'climate-dashboard': {
      requiredPermissions: ['energy_assets.view', 'dashboard.view'],
      minRolePriority: 70,
      description: 'Climate receivables dashboard'
    },
    'energy-assets': {
      requiredPermissions: ['energy_assets.view', 'energy_assets.create'],
      minRolePriority: 70,
      description: 'Energy asset management'
    },
    'production-data': {
      requiredPermissions: ['production_data.view'],
      minRolePriority: 70,
      description: 'Production data tracking'
    },
    'receivables': {
      requiredPermissions: ['receivables.view', 'receivables.create'],
      minRolePriority: 70,
      description: 'Climate receivables management'
    },
    'tokenization-pools': {
      requiredPermissions: ['pool.view', 'tokenization.view'],
      minRolePriority: 70,
      description: 'Climate tokenization pools'
    },
    'incentives': {
      requiredPermissions: ['incentives.view'],
      minRolePriority: 70,
      description: 'Climate incentive tracking'
    },
    'carbon-offsets': {
      requiredPermissions: ['carbon_offsets.view'],
      minRolePriority: 70,
      description: 'Carbon offset management'
    },
    'recs': {
      requiredPermissions: ['recs.view'],
      minRolePriority: 70,
      description: 'Renewable Energy Certificates'
    },
    'climate-tokenization': {
      requiredPermissions: ['tokenization.create', 'tokenization.view'],
      minRolePriority: 70,
      description: 'Climate asset tokenization'
    },
    'climate-distribution': {
      requiredPermissions: ['distribution.view', 'transactions.bulk_distribute'],
      minRolePriority: 70,
      description: 'Climate asset distribution'
    },
    'climate-analytics': {
      requiredPermissions: ['analytics.view', 'reports.view'],
      minRolePriority: 70,
      description: 'Climate analytics and reporting'
    },

    // WALLET MANAGEMENT SECTION
    'wallet-dashboard': {
      requiredPermissions: ['wallet.view'],
      minRolePriority: 60,
      description: 'Wallet dashboard overview'
    },
    'new-wallet': {
      requiredPermissions: ['wallet.create'],
      minRolePriority: 60,
      description: 'Create new wallets'
    },
    'dfns-custody': {
      requiredPermissions: ['wallet.view', 'custody.view'],
      minRolePriority: 60,
      description: 'DFNS custody integration'
    },

    // COMPLIANCE SECTION
    'organization-management': {
      requiredPermissions: ['user.view', 'user.edit', 'compliance_kyc_kyb.view'],
      minRolePriority: 60,
      description: 'Organization user management'
    },
    'investor-management': {
      requiredPermissions: ['investor.view', 'investor.edit', 'compliance_kyc_kyb.view'],
      minRolePriority: 60,
      description: 'Investor compliance management'
    },
    'upload-organizations': {
      requiredPermissions: ['user.bulk', 'user.create'],
      minRolePriority: 70,
      description: 'Bulk organization uploads'
    },
    'upload-investors': {
      requiredPermissions: ['investor.bulk', 'investor.create'],
      minRolePriority: 70,
      description: 'Bulk investor uploads'
    },
    'wallet-operations': {
      requiredPermissions: ['wallet.view', 'wallet.bulk', 'investor.view'],
      minRolePriority: 70,
      description: 'Bulk wallet operations'
    },
    'compliance-rules': {
      requiredPermissions: ['policy_rules.view', 'policy_rules.create'],
      minRolePriority: 70,
      description: 'Compliance rule management'
    },
    'restrictions': {
      requiredPermissions: ['policy_rules.view'],
      minRolePriority: 70,
      description: 'Trading restrictions management'
    },

    // INVESTOR PORTAL SECTION
    'offerings': {
      requiredPermissions: ['offerings.view'],
      minRolePriority: 50,
      description: 'Investment offerings'
    },
    'investor-profile': {
      requiredPermissions: ['investor_portal.view', 'profile.view'],
      minRolePriority: 50,
      description: 'Investor profile management'
    },
    'investor-documents': {
      requiredPermissions: ['investor_portal.view', 'documents.view'],
      minRolePriority: 50,
      description: 'Investor document management'
    },

    // ADMINISTRATION SECTION
    'roles': {
      requiredPermissions: ['user.assign_role', 'user.view'],
      minRolePriority: 90,
      description: 'Role management system'
    },
    'sidebar-configuration': {
      requiredPermissions: ['system.configure'],
      minRolePriority: 100,
      description: 'Sidebar configuration management'
    },
    'activity-monitor': {
      requiredPermissions: ['system.audit'],
      minRolePriority: 90,
      description: 'System activity monitoring'
    }
  };

  /**
   * Validate permissions for a navigation item/module
   */
  public validateItemPermissions(
    itemId: string, 
    userContext: UserContext
  ): PermissionValidationResult {
    const moduleConfig = this.modulePermissions[itemId];
    
    if (!moduleConfig) {
      // If no configuration found, allow but log warning
      console.warn(`No permission configuration found for item: ${itemId}`);
      return {
        isValid: true,
        matchedPermissions: [],
        missingPermissions: [],
        reason: 'No permission configuration - allowing access'
      };
    }

    // Check minimum role priority first
    if (moduleConfig.minRolePriority && userContext.highestRolePriority < moduleConfig.minRolePriority) {
      return {
        isValid: false,
        matchedPermissions: [],
        missingPermissions: moduleConfig.requiredPermissions,
        reason: `Insufficient role priority (${userContext.highestRolePriority} < ${moduleConfig.minRolePriority})`
      };
    }

    // Check primary permissions
    const matchedPrimary = moduleConfig.requiredPermissions.filter(permission =>
      userContext.permissions.includes(permission)
    );

    const missingPrimary = moduleConfig.requiredPermissions.filter(permission =>
      !userContext.permissions.includes(permission)
    );

    // If all primary permissions matched, allow access
    if (missingPrimary.length === 0) {
      return {
        isValid: true,
        matchedPermissions: matchedPrimary,
        missingPermissions: [],
        reason: 'All required permissions present'
      };
    }

    // Check if user has ANY of the required permissions (OR logic)
    if (matchedPrimary.length > 0) {
      return {
        isValid: true,
        matchedPermissions: matchedPrimary,
        missingPermissions: missingPrimary,
        reason: 'Some required permissions present (OR logic)'
      };
    }

    // Check alternative permissions if configured
    if (moduleConfig.alternativePermissions && moduleConfig.alternativePermissions.length > 0) {
      const matchedAlternatives = moduleConfig.alternativePermissions.filter(permission =>
        userContext.permissions.includes(permission)
      );

      if (matchedAlternatives.length > 0) {
        return {
          isValid: true,
          matchedPermissions: matchedAlternatives,
          missingPermissions: missingPrimary,
          reason: 'Alternative permissions matched'
        };
      }
    }

    // No permissions matched
    return {
      isValid: false,
      matchedPermissions: [],
      missingPermissions: missingPrimary,
      reason: 'Missing all required permissions'
    };
  }

  /**
   * Validate permissions for a section
   */
  public validateSectionPermissions(
    sectionId: string,
    requiredPermissions: string[],
    minRolePriority: number | undefined,
    userContext: UserContext
  ): PermissionValidationResult {
    // Check minimum role priority
    if (minRolePriority && userContext.highestRolePriority < minRolePriority) {
      return {
        isValid: false,
        matchedPermissions: [],
        missingPermissions: requiredPermissions,
        reason: `Section requires role priority ${minRolePriority}, user has ${userContext.highestRolePriority}`
      };
    }

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return {
        isValid: true,
        matchedPermissions: [],
        missingPermissions: [],
        reason: 'No permissions required for section'
      };
    }

    // Check if user has any of the required permissions (OR logic for sections)
    const matchedPermissions = requiredPermissions.filter(permission =>
      userContext.permissions.includes(permission)
    );

    const missingPermissions = requiredPermissions.filter(permission =>
      !userContext.permissions.includes(permission)
    );

    if (matchedPermissions.length > 0) {
      return {
        isValid: true,
        matchedPermissions,
        missingPermissions,
        reason: 'User has some section permissions'
      };
    }

    return {
      isValid: false,
      matchedPermissions: [],
      missingPermissions,
      reason: 'User missing all section permissions'
    };
  }

  /**
   * Get all missing permissions for user across all modules
   */
  public getComprehensivePermissionReport(userContext: UserContext): {
    accessibleModules: string[];
    restrictedModules: string[];
    missingPermissions: string[];
    recommendedRoleUpgrade?: string;
  } {
    const accessibleModules: string[] = [];
    const restrictedModules: string[] = [];
    const allMissingPermissions = new Set<string>();

    // Check each module
    Object.entries(this.modulePermissions).forEach(([moduleId, config]) => {
      const validation = this.validateItemPermissions(moduleId, userContext);
      
      if (validation.isValid) {
        accessibleModules.push(moduleId);
      } else {
        restrictedModules.push(moduleId);
        validation.missingPermissions.forEach(permission => 
          allMissingPermissions.add(permission)
        );
      }
    });

    // Determine recommended role upgrade
    let recommendedRoleUpgrade: string | undefined;
    const highestPriorityNeeded = Math.max(
      ...restrictedModules.map(moduleId => this.modulePermissions[moduleId].minRolePriority || 0)
    );

    if (highestPriorityNeeded > userContext.highestRolePriority) {
      if (highestPriorityNeeded >= 100) recommendedRoleUpgrade = 'Super Admin';
      else if (highestPriorityNeeded >= 90) recommendedRoleUpgrade = 'Owner/Investor';
      else if (highestPriorityNeeded >= 70) recommendedRoleUpgrade = 'Operations';
      else if (highestPriorityNeeded >= 60) recommendedRoleUpgrade = 'Agent';
      else recommendedRoleUpgrade = 'Viewer';
    }

    return {
      accessibleModules,
      restrictedModules,
      missingPermissions: Array.from(allMissingPermissions),
      recommendedRoleUpgrade
    };
  }

  /**
   * Debug helper - log permission validation details
   */
  public debugPermissionValidation(itemId: string, userContext: UserContext): void {
    const validation = this.validateItemPermissions(itemId, userContext);
    console.log(`Permission validation for ${itemId}:`, {
      isValid: validation.isValid,
      reason: validation.reason,
      userPermissions: userContext.permissions.length,
      userRolePriority: userContext.highestRolePriority,
      matchedPermissions: validation.matchedPermissions,
      missingPermissions: validation.missingPermissions
    });
  }
}

export const sidebarPermissionValidator = SidebarPermissionValidationService.getInstance();
