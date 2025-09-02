import { supabase } from "@/infrastructure/database/client";
import { universalDatabaseService } from "@/services/database/UniversalDatabaseService";
import { v4 as uuidv4 } from "uuid";
import type { Tables } from "@/types/core/database";
import type { Investor as DomainInvestor } from "@/types/shared/models";
import { mapDbInvestorToInvestor } from "@/utils/shared/formatting/typeMappers";

// Define KYC status type
export type KYCStatus = "pending" | "approved" | "failed" | "not_started" | "expired";

// Types
export interface InvestorSubscription {
  id: string;
  investor_id: string;
  project_id: string;
  subscription_id: string;
  currency: string;
  fiat_amount: number;
  subscription_date: string;
  confirmed: boolean;
  allocated: boolean;
  distributed: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TokenAllocation {
  id: string;
  subscription_id: string;
  token_amount: number;
  token_type: string;
  distributed: boolean;
  distribution_date?: string | null;
  distribution_tx_hash?: string | null;
  created_at?: string;
}

// Fetch all investors (read-only, no audit needed)
export async function getInvestors(): Promise<DomainInvestor[]> {
  const { data, error } = await supabase
    .from("investors")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching investors:", error);
    throw error;
  }

  return data ? data.map(mapDbInvestorToInvestor) : [];
}

// Fetch a specific investor (read-only, no audit needed)
export async function getInvestor(
  investorId: string,
): Promise<DomainInvestor | null> {
  let query = supabase
    .from("investors")
    .select("*");
  
  query = (query as any).eq("id", investorId).single();
  
  const { data, error } = await query;

  if (error) {
    console.error(`Error fetching investor ${investorId}:`, error);
    return null;
  }

  return data ? mapDbInvestorToInvestor(data) : null;
}

// Create a new investor with audit logging
export async function createInvestor(
  investorData: Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">,
  userId?: string
): Promise<DomainInvestor | null> {
  try {
    const newInvestor = {
      name: investorData.name,
      email: investorData.email,
      type: investorData.type,
      company: investorData.company || null,
      kyc_status: investorData.kycStatus || "not_started",
      kyc_expiry_date: investorData.kycExpiryDate 
        ? (investorData.kycExpiryDate instanceof Date 
            ? investorData.kycExpiryDate.toISOString() 
            : new Date(investorData.kycExpiryDate).toISOString())
        : null,
      wallet_address: investorData.walletAddress || null,
    };

    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create(
      "investors",
      newInvestor,
      { userId }
    );

    return result ? mapDbInvestorToInvestor(result) : null;
  } catch (error) {
    console.error("Error creating investor:", error);
    throw error;
  }
}

// Update an existing investor with audit logging
export async function updateInvestor(
  investorId: string,
  updates: Partial<Omit<DomainInvestor, "id" | "createdAt" | "updatedAt">>,
  userId?: string
): Promise<DomainInvestor | null> {
  try {
    const updateData: Record<string, any> = {};

    // Convert from application model to database schema
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.company !== undefined) updateData.company = updates.company;
    if (updates.kycStatus !== undefined)
      updateData.kyc_status = updates.kycStatus;
    if (updates.kycExpiryDate !== undefined)
      updateData.kyc_expiry_date = updates.kycExpiryDate instanceof Date 
        ? updates.kycExpiryDate.toISOString() 
        : updates.kycExpiryDate;
    if (updates.walletAddress !== undefined)
      updateData.wallet_address = updates.walletAddress;

    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update(
      "investors",
      investorId,
      updateData,
      { userId }
    );

    return result ? mapDbInvestorToInvestor(result) : null;
  } catch (error) {
    console.error(`Error updating investor ${investorId}:`, error);
    throw error;
  }
}

// Delete an investor with audit logging and cascade deletes
export const deleteInvestor = async (investorId: string, userId?: string): Promise<void> => {
  try {
    // First check if there are any subscriptions for this investor
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("investor_id", investorId);

    if (subscriptionsError) {
      console.error(
        `Error checking subscriptions for investor ${investorId}:`,
        subscriptionsError,
      );
      throw subscriptionsError;
    }

    // If there are subscriptions, delete them first with audit logging
    if (subscriptions && subscriptions.length > 0) {
      const subscriptionIds = subscriptions.map((s) => s.id);

      // Delete token allocations for these subscriptions with audit logging
      for (const subscriptionId of subscriptionIds) {
        const { data: allocations, error: allocationsSelectError } = await supabase
          .from("token_allocations")
          .select("id")
          .eq("subscription_id", subscriptionId);

        if (!allocationsSelectError && allocations) {
          for (const allocation of allocations) {
            await universalDatabaseService.delete("token_allocations", allocation.id, { userId });
          }
        }
      }

      // Delete subscriptions with audit logging
      for (const subscription of subscriptions) {
        await universalDatabaseService.delete("subscriptions", subscription.id, { userId });
      }
    }

    // Check for redemption requests
    const { data: redemptions, error: redemptionsError } = await supabase
      .from("redemption_requests")
      .select("id")
      .eq("investor_id", investorId);

    if (!redemptionsError && redemptions && redemptions.length > 0) {
      // Delete redemption approvers first
      const redemptionIds = redemptions.map((r) => r.id);

      for (const redemptionId of redemptionIds) {
        const { data: approvers, error: approversSelectError } = await supabase
          .from("redemption_approvers")
          .select("id")
          .eq("redemption_id", redemptionId);

        if (!approversSelectError && approvers) {
          for (const approver of approvers) {
            await universalDatabaseService.delete("redemption_approvers", approver.id, { userId });
          }
        }
      }

      // Delete redemption requests with audit logging
      for (const redemption of redemptions) {
        await universalDatabaseService.delete("redemption_requests", redemption.id, { userId });
      }
    }

    // Delete investor from cap table associations with audit logging
    const { data: capTableAssociations, error: capTableError } = await supabase
      .from("cap_table_investors")
      .select("id")
      .eq("investor_id", investorId);

    if (capTableError) {
      console.error(
        `Error checking cap table associations for investor ${investorId}:`,
        capTableError,
      );
    } else if (capTableAssociations) {
      for (const association of capTableAssociations) {
        await universalDatabaseService.delete("cap_table_investors", association.id, { userId });
      }
    }

    // Delete investor from investor groups with audit logging
    const { data: groupAssociations, error: groupsError } = await supabase
      .from("investor_groups_investors")
      .select("id")
      .eq("investor_id", investorId);

    if (!groupsError && groupAssociations) {
      for (const association of groupAssociations) {
        await universalDatabaseService.delete("investor_groups_investors", association.id, { userId });
      }
    }

    // Finally, delete the investor with audit logging
    await universalDatabaseService.delete("investors", investorId, { userId });

    console.log(`Successfully deleted investor with ID ${investorId}`);
  } catch (error) {
    console.error(`Error in deleteInvestor for ID ${investorId}:`, error);
    throw error;
  }
};

// Get subscriptions for a specific investor (read-only, no audit needed)
export const getInvestorSubscriptions = async (
  investorId: string,
): Promise<any[]> => {
  try {
    // Get subscriptions for this investor
    // @ts-ignore: Ignoring type instantiation issues with Supabase
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select(`
        id,
        investor_id,
        project_id,
        subscription_id,
        currency,
        fiat_amount,
        subscription_date,
        confirmed,
        allocated,
        distributed,
        notes,
        projects(name)
      `)
      .eq("investor_id", investorId);

    if (subscriptionsError) {
      console.error(
        `Error fetching subscriptions for investor ${investorId}:`,
        subscriptionsError,
      );
      throw subscriptionsError;
    }

    // Get token allocations for these subscriptions
    if (subscriptions && subscriptions.length > 0) {
      const subscriptionIds = subscriptions.map((s) => s.id);

      const { data: tokenAllocations, error: tokenError } = await supabase
        .from("token_allocations")
        .select("*")
        .in("subscription_id", subscriptionIds);

      if (tokenError) {
        console.error(
          `Error fetching token allocations for investor ${investorId}:`,
          tokenError,
        );
        throw tokenError;
      }

      // Combine the data
      const enrichedSubscriptions = subscriptions.map((subscription) => {
        const allocations =
          tokenAllocations?.filter(
            (ta) => ta.subscription_id === subscription.id,
          ) || [];
        return {
          ...subscription,
          project_name: subscription.projects?.name || "Unknown Project",
          token_type: allocations.length > 0 ? allocations[0].token_type : null,
          token_amount:
            allocations.length > 0 ? allocations[0].token_amount : 0,
          token_allocations: allocations,
        };
      });

      return enrichedSubscriptions;
    }

    return subscriptions || [];
  } catch (error) {
    console.error(
      `Error in getInvestorSubscriptions for investor ${investorId}:`,
      error,
    );
    throw error;
  }
};

// Fetch investors for a specific project (read-only, no audit needed)
export const getInvestorsByProjectId = async (
  projectId: string,
): Promise<Partial<DomainInvestor>[]> => {
  // First get the cap table for this project
  const { data: capTable, error: capTableError } = await supabase
    .from("cap_tables")
    .select("id")
    .eq("project_id", projectId)
    .single();

  if (capTableError && capTableError.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    console.error(
      `Error fetching cap table for project ${projectId}:`,
      capTableError,
    );
    throw capTableError;
  }

  if (!capTable) {
    return [];
  }

  // Get investors from the cap table
  const { data, error: investorsError } = await supabase
    .from("cap_table_investors")
    .select(`
      investor_id,
      investors(*)
    `)
    .eq("cap_table_id", capTable.id);

  if (investorsError) {
    console.error(
      `Error fetching investors for project ${projectId}:`,
      investorsError,
    );
    throw investorsError;
  }

  if (!data) return [];

  // Get all subscription data separately to avoid nested query issues
  const investorIds = data.map(item => item.investor_id);
  const { data: subscriptions, error: subscriptionsError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("project_id", projectId)
    .in("investor_id", investorIds);

  if (subscriptionsError) {
    console.error(
      `Error fetching subscriptions for project ${projectId}:`,
      subscriptionsError,
    );
    // Continue without subscriptions data
  }

  // Map and return the results
  return data.map(item => {
    if (!item.investors) return {} as Partial<DomainInvestor>;
    
    const investorSubscriptions = subscriptions?.filter(
      sub => sub.investor_id === item.investor_id
    ) || [];

    const dbInvestor = Array.isArray(item.investors) 
      ? item.investors[0] 
      : item.investors;
    
    const investor = mapDbInvestorToInvestor(dbInvestor);
    
    return {
      ...investor,
      subscriptions: investorSubscriptions
    };
  });
};

// Add an investor to a project's cap table with audit logging
export const addInvestorToProject = async (
  projectId: string,
  investorId: string,
  subscriptionData: {
    subscription_id: string;
    currency: string;
    fiat_amount: number;
    subscription_date: string;
    confirmed?: boolean;
    allocated?: boolean;
    distributed?: boolean;
    notes?: string;
  },
  userId?: string
): Promise<any> => {
  try {
    // First get the cap table for this project
    const { data: capTable, error: capTableError } = await supabase
      .from("cap_tables")
      .select("id")
      .eq("project_id", projectId)
      .single();

    if (capTableError) {
      console.error(
        `Error fetching cap table for project ${projectId}:`,
        capTableError,
      );
      throw capTableError;
    }

    // Create a subscription record with audit logging
    const subscription = {
      investor_id: investorId,
      project_id: projectId,
      subscription_id: subscriptionData.subscription_id,
      currency: subscriptionData.currency,
      fiat_amount: subscriptionData.fiat_amount,
      subscription_date: subscriptionData.subscription_date,
      confirmed: subscriptionData.confirmed || false,
      allocated: subscriptionData.allocated || false,
      distributed: subscriptionData.distributed || false,
      notes: subscriptionData.notes || null,
    };

    const subscriptionResult = await universalDatabaseService.create(
      "subscriptions",
      subscription,
      { userId, projectId }
    );

    // Add investor to cap table with audit logging
    const capTableInvestor = {
      cap_table_id: capTable.id,
      investor_id: investorId,
    };

    const capTableInvestorResult = await universalDatabaseService.create(
      "cap_table_investors",
      capTableInvestor,
      { userId, projectId }
    );

    return {
      subscription: subscriptionResult,
      capTableInvestor: capTableInvestorResult,
    };
  } catch (error) {
    console.error(`Error adding investor ${investorId} to project ${projectId}:`, error);
    throw error;
  }
};

// Add a token allocation to a subscription with audit logging
export const addTokenAllocation = async (
  subscriptionId: string,
  allocationData: {
    token_amount: number;
    token_type: string;
    distributed?: boolean;
    distribution_date?: string | null;
    distribution_tx_hash?: string | null;
  },
  userId?: string
): Promise<TokenAllocation> => {
  try {
    // Get the investor_id from the subscription
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .select("investor_id, project_id")
      .eq("id", subscriptionId)
      .single();

    if (subscriptionError) {
      console.error(
        `Error getting subscription ${subscriptionId}:`,
        subscriptionError
      );
      throw subscriptionError;
    }

    // Create allocation with audit logging
    const allocation: Omit<TokenAllocation, 'id' | 'created_at'> = {
      subscription_id: subscriptionId,
      token_amount: allocationData.token_amount,
      token_type: allocationData.token_type,
      distributed: allocationData.distributed || false,
      distribution_date: allocationData.distribution_date || null,
      distribution_tx_hash: allocationData.distribution_tx_hash || null,
    };

    const result = await universalDatabaseService.create<TokenAllocation>(
      "token_allocations",
      allocation,
      { userId, projectId: subscription.project_id }
    );

    return result;
  } catch (error) {
    console.error(
      `Error creating token allocation for subscription ${subscriptionId}:`,
      error,
    );
    throw error;
  }
};

// Update a subscription with audit logging
export const updateSubscription = async (
  subscriptionId: string,
  subscriptionData: {
    currency?: string;
    fiat_amount?: number;
    subscription_date?: string;
    confirmed?: boolean;
    allocated?: boolean;
    distributed?: boolean;
    notes?: string;
  },
  userId?: string
): Promise<InvestorSubscription> => {
  try {
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update(
      "subscriptions",
      subscriptionId,
      subscriptionData,
      { userId }
    );

    return result as InvestorSubscription;
  } catch (error) {
    console.error(
      `Error updating subscription with ID ${subscriptionId}:`,
      error,
    );
    throw error;
  }
};

// Update a token allocation with audit logging
export const updateTokenAllocation = async (
  allocationId: string,
  allocationData: {
    token_amount?: number;
    token_type?: string;
    distributed?: boolean;
    distribution_date?: string | null;
    distribution_tx_hash?: string | null;
  },
  userId?: string
): Promise<TokenAllocation> => {
  try {
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update(
      "token_allocations",
      allocationId,
      allocationData,
      { userId }
    );

    return result as TokenAllocation;
  } catch (error) {
    console.error(
      `Error updating token allocation with ID ${allocationId}:`,
      error,
    );
    throw error;
  }
};

// Delete a subscription with audit logging
export const deleteSubscription = async (
  subscriptionId: string,
  userId?: string
): Promise<void> => {
  try {
    // First delete any token allocations with audit logging
    const { data: allocations, error: allocationsError } = await supabase
      .from("token_allocations")
      .select("id")
      .eq("subscription_id", subscriptionId);

    if (!allocationsError && allocations) {
      for (const allocation of allocations) {
        await universalDatabaseService.delete("token_allocations", allocation.id, { userId });
      }
    }

    // Then delete the subscription with audit logging
    await universalDatabaseService.delete("subscriptions", subscriptionId, { userId });
  } catch (error) {
    console.error(
      `Error deleting subscription with ID ${subscriptionId}:`,
      error,
    );
    throw error;
  }
};

// Update investor KYC status with audit logging
export const updateInvestorKYC = async (
  investorId: string,
  kycData: {
    kyc_status: string;
    kyc_expiry_date?: string | null;
    verification_details?: any;
  },
  userId?: string
): Promise<DomainInvestor> => {
  try {
    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.update(
      "investors",
      investorId,
      kycData,
      { userId }
    );

    return mapDbInvestorToInvestor(result);
  } catch (error) {
    console.error(
      `Error updating KYC status for investor ${investorId}:`,
      error,
    );
    throw error;
  }
};

// Get investors by KYC status (read-only, no audit needed)
export const getInvestorsByKYCStatus = async (
  status: KYCStatus,
): Promise<DomainInvestor[]> => {
  const { data, error } = await supabase
    .from("investors")
    .select("*")
    .eq("kyc_status", status)
    .order("name", { ascending: true });

  if (error) {
    console.error(`Error fetching investors with KYC status ${status}:`, error);
    throw error;
  }

  return data ? data.map(mapDbInvestorToInvestor) : [];
};

// Get investors with expiring KYC (read-only, no audit needed)
export const getInvestorsWithExpiringKYC = async (
  daysThreshold: number = 30,
): Promise<DomainInvestor[]> => {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  const thresholdDateStr = thresholdDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("investors")
    .select("*")
    .eq("kyc_status", "approved")
    .lt("kyc_expiry_date", thresholdDateStr)
    .order("kyc_expiry_date", { ascending: true });

  if (error) {
    console.error(`Error fetching investors with expiring KYC:`, error);
    throw error;
  }

  return data ? data.map(mapDbInvestorToInvestor) : [];
};
