import { supabase } from "@/infrastructure/database/client";
import { universalDatabaseService } from "@/services/database/UniversalDatabaseService";
import crypto from "crypto";

// Stub for missing imports
interface Investor {
  id: string;
  name: string;
  email: string;
  type: string;
  walletAddress: string | null;
  kycStatus: "approved" | "pending" | "failed" | "not_started" | "expired";
  lastUpdated: string;
}

interface InvestorGroup {
  id: string;
  name: string;
  investorIds: string[];
}

// Sample data for fallback
const sampleInvestors: Investor[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    type: "individual",
    walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
    kycStatus: "approved",
    lastUpdated: "2023-06-15",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    type: "entity",
    walletAddress: "0xabcdef1234567890abcdef1234567890abcdef12",
    kycStatus: "pending",
    lastUpdated: "2023-07-01",
  },
];

const sampleGroups: { name: string; investorIds: string[] }[] = [
  {
    name: "VIP Investors",
    investorIds: ["1"],
  },
  {
    name: "Institutional",
    investorIds: ["2"],
  },
];

// Investor CRUD operations (read-only, no audit needed)
export const fetchInvestors = async (): Promise<Investor[]> => {
  try {
    const { data, error } = await supabase
      .from("investors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching investors:", error);
      // Fall back to sample data if there's an error
      return sampleInvestors;
    }

    if (!data || data.length === 0) {
      // If no data in the database, seed with sample data
      await seedSampleData();
      return sampleInvestors;
    }

    return data.map((investor) => ({
      id: investor.investor_id, // Use investor_id as the id field
      name: investor.name,
      email: investor.email,
      type: investor.type,
      walletAddress: investor.wallet_address,
      kycStatus: investor.kyc_status as Investor["kycStatus"],
      lastUpdated: investor.lastUpdated, // Changed from last_updated to match the column name in the database
    }));
  } catch (error) {
    console.error("Error in fetchInvestors:", error);
    // Return sample data as fallback
    return sampleInvestors;
  }
};

// Create investor with audit logging
export const createInvestor = async (
  investor: Omit<Investor, "id">,
  userId?: string
): Promise<Investor> => {
  try {
    const investorData = {
      name: investor.name,
      email: investor.email,
      type: investor.type,
      wallet_address: investor.walletAddress,
      kyc_status: investor.kycStatus,
      lastUpdated: investor.lastUpdated,
    };

    // Use Universal Database Service for automatic audit logging
    const result = await universalDatabaseService.create<{
      investor_id: string;
      name: string;
      email: string;
      type: string;
      wallet_address: string;
      kyc_status: string;
      lastUpdated: string;
    }>(
      "investors",
      investorData,
      { userId }
    );

    return {
      id: result.investor_id, // Use investor_id as primary key
      name: result.name,
      email: result.email,
      type: result.type,
      walletAddress: result.wallet_address,
      kycStatus: result.kyc_status as Investor["kycStatus"],
      lastUpdated: result.lastUpdated,
    };
  } catch (error) {
    console.error("Error in createInvestor:", error);
    throw error;
  }
};

// Update investor with audit logging
export const updateInvestor = async (
  id: string,
  updates: Partial<Investor>,
  userId?: string
): Promise<void> => {
  try {
    // Create an update object with only the fields that are provided
    const updateObj: any = {};
    if (updates.name !== undefined) updateObj.name = updates.name;
    if (updates.email !== undefined) updateObj.email = updates.email;
    if (updates.type !== undefined) updateObj.type = updates.type;
    if (updates.walletAddress !== undefined)
      updateObj.wallet_address = updates.walletAddress;
    if (updates.kycStatus !== undefined) updateObj.kyc_status = updates.kycStatus;
    if (updates.lastUpdated !== undefined)
      updateObj.lastUpdated = updates.lastUpdated;
    else updateObj.lastUpdated = new Date().toISOString().split("T")[0];

    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.update(
      "investors",
      id,
      updateObj,
      { userId }
    );
  } catch (error) {
    console.error("Error updating investor:", error);
    throw error;
  }
};

// Delete investor with audit logging
export const deleteInvestor = async (id: string, userId?: string): Promise<void> => {
  try {
    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.delete("investors", id, { userId });
  } catch (error) {
    console.error("Error deleting investor:", error);
    throw error;
  }
};

// Bulk create investors with audit logging
export const bulkCreateInvestors = async (
  investors: Omit<Investor, "id">[],
  userId?: string
): Promise<void> => {
  try {
    // Ensure all required fields are present and properly formatted
    const formattedInvestors = investors.map((investor) => ({
      name: investor.name,
      email: investor.email,
      type: investor.type,
      wallet_address: investor.walletAddress || null,
      kyc_status: investor.kycStatus || "not_started",
      lastUpdated:
        investor.lastUpdated || new Date().toISOString().split("T")[0],
    }));

    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.bulkCreate(
      "investors",
      formattedInvestors,
      { userId }
    );
  } catch (error) {
    console.error("Error in bulkCreateInvestors:", error);
    throw error;
  }
};

// Function to seed sample data into the database with audit logging
const seedSampleData = async (userId?: string): Promise<void> => {
  try {
    // Insert sample investors with audit logging
    const investorData = sampleInvestors.map((investor) => ({
      name: investor.name,
      email: investor.email,
      type: investor.type,
      wallet_address: investor.walletAddress,
      kyc_status: investor.kycStatus,
      lastUpdated: investor.lastUpdated,
    }));

    await universalDatabaseService.bulkCreate("investors", investorData, { userId });

    // Insert sample groups with audit logging
    for (const group of sampleGroups) {
      const groupData = { name: group.name };
      const createdGroup = await universalDatabaseService.create<{
        id: string;
        name: string;
      }>(
        "investor_groups", 
        groupData, 
        { userId }
      );

      // Insert group-investor relationships with audit logging
      if (group.investorIds.length > 0) {
        const relationshipData = group.investorIds.map((investorId) => ({
          group_id: createdGroup.id,
          investor_id: investorId,
        }));

        await universalDatabaseService.bulkCreate(
          "investor_groups_investors",
          relationshipData,
          { userId }
        );
      }
    }

    console.log("Sample data seeded successfully");
  } catch (error) {
    console.error("Error seeding sample data:", error);
  }
};

// Bulk update investors with audit logging
export const bulkUpdateInvestors = async (
  ids: string[],
  updates: Partial<Investor>,
  userId?: string
): Promise<void> => {
  try {
    // Create an update object with only the fields that are provided
    const updateObj: any = {};
    if (updates.name !== undefined) updateObj.name = updates.name;
    if (updates.email !== undefined) updateObj.email = updates.email;
    if (updates.type !== undefined) updateObj.type = updates.type;
    if (updates.walletAddress !== undefined)
      updateObj.wallet_address = updates.walletAddress;
    if (updates.kycStatus !== undefined) {
      // Ensure kycStatus is one of the allowed enum values
      const validStatuses = [
        "approved",
        "pending",
        "failed",
        "not_started",
        "expired",
      ];
      if (!validStatuses.includes(updates.kycStatus)) {
        throw new Error(
          `Invalid KYC status: ${updates.kycStatus}. Must be one of: ${validStatuses.join(", ")}`,
        );
      }
      updateObj.kyc_status = updates.kycStatus;
    }
    if (updates.lastUpdated !== undefined)
      updateObj.lastUpdated = updates.lastUpdated;
    else updateObj.lastUpdated = new Date().toISOString().split("T")[0];

    // Update each investor individually for proper audit logging
    for (const id of ids) {
      await universalDatabaseService.update("investors", id, updateObj, { userId });
    }
  } catch (error) {
    console.error("Error in bulkUpdateInvestors:", error);
    throw error;
  }
};

// Bulk delete investors with audit logging
export const bulkDeleteInvestors = async (ids: string[], userId?: string): Promise<void> => {
  try {
    // Delete each investor individually for proper audit logging
    for (const id of ids) {
      await universalDatabaseService.delete("investors", id, { userId });
    }
  } catch (error) {
    console.error("Error bulk deleting investors:", error);
    throw error;
  }
};

// Group CRUD operations (read-only, no audit needed)
export const fetchGroups = async (): Promise<InvestorGroup[]> => {
  try {
    // First get all groups
    const { data: groups, error: groupsError } = await supabase
      .from("investor_groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (groupsError) {
      console.error("Error fetching groups:", groupsError);
      // Return sample groups if there's an error
      return sampleGroups.map((group, index) => ({
      id: `group_${index + 1}`,
      name: group.name,
      investorIds: group.investorIds,
      }));
    }

    if (!groups || groups.length === 0) {
      // If no groups in the database, return sample groups
      return sampleGroups.map((group, index) => ({
        id: (index + 1).toString(),
        name: group.name,
        investorIds: group.investorIds,
      }));
    }

    // Then get all group-investor relationships
    const { data: relationships, error: relError } = await supabase
      .from("investor_groups_investors")
      .select("*");

    if (relError) {
      console.error("Error fetching group relationships:", relError);
      throw relError;
    }

    // Map the relationships to the groups
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      investorIds: relationships
        ? relationships
            .filter((rel) => rel.group_id === group.id)
            .map((rel) => rel.investor_id)
        : [],
    }));
  } catch (error) {
    console.error("Error in fetchGroups:", error);
    // Return sample groups as fallback
    return sampleGroups.map((group, index) => ({
      id: `group_${index + 1}`,
      name: group.name,
      investorIds: group.investorIds,
    }));
  }
};

// Create group with audit logging
export const createGroup = async (
  name: string,
  investorIds: string[] = [],
  userId?: string
): Promise<InvestorGroup> => {
  try {
    // First create the group with audit logging
    const groupData = { name };
    const group = await universalDatabaseService.create<{
      id: string;
      name: string;
    }>(
      "investor_groups",
      groupData,
      { userId }
    );

    // If there are investor IDs, create the relationships with audit logging
    if (investorIds.length > 0) {
      const relationshipData = investorIds.map((investorId) => ({
        group_id: group.id,
        investor_id: investorId,
      }));

      await universalDatabaseService.bulkCreate(
        "investor_groups_investors",
        relationshipData,
        { userId }
      );
    }

    return {
      id: group.id,
      name: group.name,
      investorIds,
    };
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
};

// Update group with audit logging
export const updateGroup = async (id: string, name: string, userId?: string): Promise<void> => {
  try {
    // Use Universal Database Service for automatic audit logging
    await universalDatabaseService.update("investor_groups", id, { name }, { userId });
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
};

// Delete group with audit logging
export const deleteGroup = async (id: string, userId?: string): Promise<void> => {
  try {
    // First delete all relationships with audit logging
    const { data: relationships, error: relFetchError } = await supabase
      .from("investor_groups_investors")
      .select("id")
      .eq("group_id", id);

    if (!relFetchError && relationships) {
      for (const rel of relationships) {
        await universalDatabaseService.delete("investor_groups_investors", rel.id, { userId });
      }
    }

    // Then delete the group with audit logging
    await universalDatabaseService.delete("investor_groups", id, { userId });
  } catch (error) {
    console.error("Error deleting group:", error);
    throw error;
  }
};

// Add investors to group with audit logging
export const addInvestorsToGroup = async (
  groupId: string,
  investorIds: string[],
  userId?: string
): Promise<void> => {
  try {
    // First get existing relationships to avoid duplicates
    const { data: existingRels, error: fetchError } = await supabase
      .from("investor_groups_investors")
      .select("investor_id")
      .eq("group_id", groupId);

    if (fetchError) {
      console.error("Error fetching existing relationships:", fetchError);
      throw fetchError;
    }

    // Filter out investors that are already in the group
    const existingInvestorIds = existingRels?.map((rel) => rel.investor_id) || [];
    const newInvestorIds = investorIds.filter(
      (id) => !existingInvestorIds.includes(id),
    );

    if (newInvestorIds.length === 0) return;

    // Add the new relationships with audit logging
    const relationshipData = newInvestorIds.map((investorId) => ({
      group_id: groupId,
      investor_id: investorId,
    }));

    await universalDatabaseService.bulkCreate(
      "investor_groups_investors",
      relationshipData,
      { userId }
    );
  } catch (error) {
    console.error("Error adding investors to group:", error);
    throw error;
  }
};

// Remove investors from group with audit logging
export const removeInvestorsFromGroup = async (
  groupId: string,
  investorIds: string[],
  userId?: string
): Promise<void> => {
  try {
    // Get the relationship IDs to delete
    const { data: relationships, error: fetchError } = await supabase
      .from("investor_groups_investors")
      .select("id")
      .eq("group_id", groupId)
      .in("investor_id", investorIds);

    if (fetchError) {
      console.error("Error fetching relationships to delete:", fetchError);
      throw fetchError;
    }

    // Delete each relationship with audit logging
    if (relationships) {
      for (const rel of relationships) {
        await universalDatabaseService.delete("investor_groups_investors", rel.id, { userId });
      }
    }
  } catch (error) {
    console.error("Error removing investors from group:", error);
    throw error;
  }
};
