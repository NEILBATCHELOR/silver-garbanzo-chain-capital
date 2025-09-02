import { supabase } from "@/infrastructure/database/client";
import { universalDatabaseService } from "@/services/database/UniversalDatabaseService";
import { v4 as uuidv4 } from "uuid";
import { getInvestorsByProjectId, addInvestorToProject } from "@/services/investor/investors";
import type { Investor } from "@/types/core/centralModels";

// Types
export interface CapTable {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CapTableInvestor {
  id: string;
  cap_table_id: string;
  investor_id: string;
  created_at?: string;
}

export interface InvestorWithSubscription {
  investor_id: string;
  name: string;
  email: string;
  company?: string;
  subscriptionAmount: number;
  tokenAllocation: number;
  status: string;
  securityType: string;
  investmentDate: string;
  kycStatus?: string;
  paymentStatus?: string;
  notes?: string;
  subscriptionId: string;
}

// Interface for subscription data
interface Subscription {
  id: string;
  fiat_amount: number;
  subscription_date: string;
  confirmed: boolean;
  allocated: boolean;
  notes?: string;
  token_allocations: TokenAllocation[];
}

// Interface for token allocation data
interface TokenAllocation {
  token_amount: number;
  token_type: string;
}

// Interface for the data returned by getInvestorsByProjectId
interface ProjectInvestor {
  id?: string;
  name?: string;
  email?: string;
  company?: string;
  type?: string;
  kycStatus?: string;
  kycExpiryDate?: string | null;
  walletAddress?: string;
  subscriptions?: Subscription[];
}

// Create a new cap table for a project with audit logging
export const createCapTable = async (
  projectId: string,
  name: string,
  description?: string,
  userId?: string
): Promise<CapTable> => {
  try {
    const capTableData: Omit<CapTable, 'id' | 'created_at' | 'updated_at'> = {
      project_id: projectId,
      name,
      description: description || null,
    };

    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create<CapTable>(
      "cap_tables",
      capTableData,
      { userId, projectId }
    );

    return result;
  } catch (error) {
    console.error("Error creating cap table:", error);
    throw error;
  }
};

// Get a project's cap table (read-only, no audit needed)
export const getCapTable = async (
  projectId: string,
): Promise<CapTable | null> => {
  const { data, error } = await supabase
    .from("cap_tables")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No cap table found, create one
      return createCapTable(projectId, `Cap Table for Project ${projectId}`);
    }
    console.error(`Error fetching cap table for project ${projectId}:`, error);
    throw error;
  }

  return data;
};

// Get all investors for a cap table with their subscription details (read-only, no audit needed)
export const getCapTableInvestors = async (
  projectId: string,
): Promise<InvestorWithSubscription[]> => {
  try {
    // First get the raw data from the database
    const projectInvestors = (await getInvestorsByProjectId(projectId)) as unknown as ProjectInvestor[];

    // Transform the data to match the UI format
    const transformedInvestors = projectInvestors.map((investor) => {
      // Extract investor data - matching the actual structure from getInvestorsByProjectId
      const subscription: Subscription = investor.subscriptions?.[0] || {
        id: "",
        fiat_amount: 0,
        subscription_date: new Date().toISOString().split("T")[0],
        confirmed: false,
        allocated: false,
        token_allocations: []
      };
      
      const tokenAllocation: TokenAllocation = subscription.token_allocations?.[0] || {
        token_amount: 0,
        token_type: "equity"
      };

      return {
        investor_id: investor.id || '',
        name: investor.name || '',
        email: investor.email || '',
        company: investor.company || "",
        subscriptionAmount: subscription.fiat_amount,
        tokenAllocation: tokenAllocation.token_amount,
        status: subscription.confirmed
          ? "confirmed"
          : subscription.allocated
            ? "allocated"
            : "pending",
        securityType: tokenAllocation.token_type,
        investmentDate:
          subscription.subscription_date ||
          new Date().toISOString().split("T")[0],
        kycStatus: investor.kycStatus || "not_started",
        paymentStatus: subscription.confirmed ? "paid" : "pending",
        notes: subscription.notes || "",
        subscriptionId: subscription.id,
      };
    });

    return transformedInvestors;
  } catch (error) {
    console.error(
      `Error fetching cap table investors for project ${projectId}:`,
      error,
    );
    throw error;
  }
};

// Add an investor to a cap table with audit logging
export const addInvestorToCapTable = async (
  projectId: string,
  investorData: {
    investor_id: string;
    subscription_id?: string;
    currency: string;
    fiat_amount: number;
    subscription_date?: string;
    token_amount: number;
    token_type: string;
    notes?: string;
  },
  userId?: string
): Promise<any> => {
  try {
    // First check if the cap table exists for this project
    const capTable = await getCapTable(projectId);
    if (!capTable) {
      throw new Error(`Cap table not found for project ${projectId}`);
    }

    // Check if the investor exists
    const { data: investor, error: investorError } = await supabase
      .from("investors")
      .select("*")
      .eq("investor_id", investorData.investor_id)
      .single();

    if (investorError) {
      console.error(
        `Error fetching investor ${investorData.investor_id}:`,
        investorError,
      );
      throw investorError;
    }

    // Add the investor to the project's cap table using the already audited function
    const result = await addInvestorToProject(
      projectId,
      investorData.investor_id,
      {
        subscription_id:
          investorData.subscription_id ||
          `SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        currency: investorData.currency,
        fiat_amount: investorData.fiat_amount,
        subscription_date:
          investorData.subscription_date || new Date().toISOString(),
        notes: investorData.notes,
      },
      userId
    );

    // Add token allocation with audit logging
    const tokenAllocationData = {
      subscription_id: result.subscription.id,
      token_amount: investorData.token_amount,
      token_type: investorData.token_type,
      distributed: false,
      investor_id: investorData.investor_id,
    };

    const tokenAllocation = await universalDatabaseService.create(
      "token_allocations",
      tokenAllocationData,
      { userId, projectId }
    );

    // Add the investor to the cap table with audit logging
    const capTableInvestorData = {
      cap_table_id: capTable.id,
      investor_id: investorData.investor_id,
    };

    const capTableInvestor = await universalDatabaseService.create(
      "cap_table_investors",
      capTableInvestorData,
      { userId, projectId }
    );

    return {
      subscription: result.subscription,
      tokenAllocation,
      capTableInvestor,
    };
  } catch (error) {
    console.error(
      `Error adding investor to cap table for project ${projectId}:`,
      error,
    );
    throw error;
  }
};

// Update an investor's subscription in the cap table with audit logging
export const updateInvestorSubscription = async (
  subscriptionId: string,
  updateData: {
    fiat_amount?: number;
    confirmed?: boolean;
    allocated?: boolean;
    distributed?: boolean;
    notes?: string;
    token_amount?: number;
    token_type?: string;
  },
  userId?: string
): Promise<any> => {
  try {
    // Update subscription data with audit logging
    const subscriptionUpdate = {
      fiat_amount: updateData.fiat_amount,
      confirmed: updateData.confirmed,
      allocated: updateData.allocated,
      distributed: updateData.distributed,
      notes: updateData.notes,
    };

    // Remove undefined values
    Object.keys(subscriptionUpdate).forEach((key) => {
      if (subscriptionUpdate[key] === undefined) {
        delete subscriptionUpdate[key];
      }
    });

    // Use Universal Database Service for automatic audit logging
    const subscription = await universalDatabaseService.update(
      "subscriptions",
      subscriptionId,
      subscriptionUpdate,
      { userId }
    );

    let allocation = null;

    // If token allocation data is provided, update it with audit logging
    if (
      updateData.token_amount !== undefined ||
      updateData.token_type !== undefined
    ) {
      // First get the token allocation ID
      const { data: allocations, error: getError } = await supabase
        .from("token_allocations")
        .select("id")
        .eq("subscription_id", subscriptionId);

      if (getError) {
        console.error(
          `Error getting token allocations for subscription ${subscriptionId}:`,
          getError,
        );
        throw getError;
      }

      if (allocations && allocations.length > 0) {
        const allocationId = allocations[0].id;

        const allocationUpdate = {
          token_amount: updateData.token_amount,
          token_type: updateData.token_type,
        };

        // Remove undefined values
        Object.keys(allocationUpdate).forEach((key) => {
          if (allocationUpdate[key] === undefined) {
            delete allocationUpdate[key];
          }
        });

        // Use Universal Database Service for automatic audit logging
        allocation = await universalDatabaseService.update(
          "token_allocations",
          allocationId,
          allocationUpdate,
          { userId }
        );
      }
    }

    return allocation ? { subscription, allocation } : { subscription };
  } catch (error) {
    console.error(
      `Error updating investor subscription ${subscriptionId}:`,
      error,
    );
    throw error;
  }
};

// Remove an investor from a cap table with audit logging
export const removeInvestorFromCapTable = async (
  capTableId: string,
  investorId: string,
  userId?: string
): Promise<void> => {
  try {
    // First get the cap table investor records
    const { data: capTableInvestors, error: getError } = await supabase
      .from("cap_table_investors")
      .select("id")
      .eq("cap_table_id", capTableId)
      .eq("investor_id", investorId);

    if (getError) {
      console.error(`Error getting cap table investor record:`, getError);
      throw getError;
    }

    if (!capTableInvestors || capTableInvestors.length === 0) {
      console.error(
        `Investor ${investorId} not found in cap table ${capTableId}`,
      );
      return;
    }

    // Get subscriptions for this investor
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("investor_id", investorId);

    if (subError) {
      console.error(
        `Error getting subscriptions for investor ${investorId}:`,
        subError,
      );
      throw subError;
    }

    // Delete token allocations for these subscriptions with audit logging
    if (subscriptions && subscriptions.length > 0) {
      for (const subscription of subscriptions) {
        const { data: allocations, error: allocError } = await supabase
          .from("token_allocations")
          .select("id")
          .eq("subscription_id", subscription.id);

        if (!allocError && allocations) {
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

    // Delete cap table investor records with audit logging
    for (const capTableInvestor of capTableInvestors) {
      await universalDatabaseService.delete("cap_table_investors", capTableInvestor.id, { userId });
    }
  } catch (error) {
    console.error(`Error removing investor from cap table:`, error);
    throw error;
  }
};

// Bulk update investors in a cap table with audit logging
export const bulkUpdateInvestors = async (
  investorIds: string[],
  updateData: {
    status?: string;
    securityType?: string;
  },
  userId?: string
): Promise<void> => {
  try {
    // Get subscriptions for these investors
    const { data: subscriptions, error: getError } = await supabase
      .from("subscriptions")
      .select("id, investor_id")
      .in("investor_id", investorIds);

    if (getError) {
      console.error(`Error getting subscriptions for investors:`, getError);
      throw getError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.error(`No subscriptions found for the selected investors`);
      return;
    }

    // Update subscription status if provided with audit logging
    if (updateData.status) {
      const subscriptionUpdate = {
        confirmed: updateData.status === "confirmed",
        allocated:
          updateData.status === "allocated" ||
          updateData.status === "confirmed",
        distributed: updateData.status === "distributed",
      };

      // Update each subscription individually for proper audit logging
      for (const subscription of subscriptions) {
        await universalDatabaseService.update(
          "subscriptions",
          subscription.id,
          subscriptionUpdate,
          { userId }
        );
      }
    }

    // Update security type if provided with audit logging
    if (updateData.securityType) {
      // Get token allocations for these subscriptions
      for (const subscription of subscriptions) {
        const { data: allocations, error: allocError } = await supabase
          .from("token_allocations")
          .select("id")
          .eq("subscription_id", subscription.id);

        if (!allocError && allocations) {
          for (const allocation of allocations) {
            await universalDatabaseService.update(
              "token_allocations",
              allocation.id,
              { token_type: updateData.securityType },
              { userId }
            );
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error performing bulk update on investors:`, error);
    throw error;
  }
};

// Get cap table summary statistics (read-only, no audit needed)
export const getCapTableSummary = async (projectId: string): Promise<any> => {
  try {
    // Get the cap table
    const capTable = await getCapTable(projectId);

    if (!capTable) {
      throw new Error(`Cap table not found for project ${projectId}`);
    }

    // Get all investors with their subscriptions
    const investors = await getCapTableInvestors(projectId);

    // Calculate summary statistics
    const totalInvestors = investors.length;
    const totalAllocation = investors.reduce(
      (sum, inv) => sum + inv.subscriptionAmount,
      0,
    );
    const totalTokens = investors.reduce(
      (sum, inv) => sum + inv.tokenAllocation,
      0,
    );

    // Calculate security type distribution
    const securityTypes = {};
    investors.forEach((inv) => {
      securityTypes[inv.securityType] =
        (securityTypes[inv.securityType] || 0) + 1;
    });

    // Calculate security type percentages
    const securityTypePercentages = {};
    Object.entries(securityTypes).forEach(([type, count]) => {
      securityTypePercentages[type] = Math.round(
        ((count as number) / totalInvestors) * 100,
      );
    });

    return {
      totalInvestors,
      totalAllocation,
      totalTokens,
      securityTypes: securityTypePercentages,
      investors,
    };
  } catch (error) {
    console.error(
      `Error getting cap table summary for project ${projectId}:`,
      error,
    );
    throw error;
  }
};

// Get token allocations for a specific project (read-only, no audit needed)
export const getTokenAllocationsByProjectId = async (projectId: string) => {
  try {
    // First get the subscriptions for this project
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("project_id", projectId);

    if (subscriptionsError) {
      console.error(
        `Error fetching subscriptions for project ${projectId}:`,
        subscriptionsError,
      );
      throw subscriptionsError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return [];
    }

    // Get token allocations for these subscriptions
    const subscriptionIds = subscriptions.map((s) => s.id);
    const { data: allocations, error: allocationsError } = await supabase
      .from("token_allocations")
      .select("*")
      .in("subscription_id", subscriptionIds);

    if (allocationsError) {
      console.error(
        `Error fetching token allocations for project ${projectId}:`,
        allocationsError,
      );
      throw allocationsError;
    }

    return allocations || [];
  } catch (error) {
    console.error(
      `Error in getTokenAllocationsByProjectId for project ${projectId}:`,
      error,
    );
    return [];
  }
};
