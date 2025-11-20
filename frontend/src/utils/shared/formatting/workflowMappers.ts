import { RedemptionRequest, Approver } from "@/types/core/centralModels";

export const mapDbRedemptionRequestToRedemptionRequest = (dbRedemption: any): RedemptionRequest => {
  return {
    id: dbRedemption.id || "",
    project_id: dbRedemption.project_id || null,
    organization_id: dbRedemption.organization_id || null,
    requestDate: dbRedemption.created_at || null,
    tokenAmount: dbRedemption.token_amount || 0,
    tokenType: dbRedemption.token_type || "",
    redemptionType: dbRedemption.redemption_type || "",
    status: dbRedemption.status || "Pending",
    sourceWalletAddress: dbRedemption.source_wallet_address || "",
    destinationWalletAddress: dbRedemption.destination_wallet_address || "",
    conversionRate: dbRedemption.conversion_rate || 0,
    investorName: dbRedemption.investor_name || "",
    investorId: dbRedemption.investor_id || "",
    isBulkRedemption: dbRedemption.is_bulk_redemption || false,
    investorCount: dbRedemption.investor_count || 0,
    approvers: (dbRedemption.approvers || []).map(mapDbApproverToApprover),
    requiredApprovals: dbRedemption.required_approvals || 0,
    required_approvals: dbRedemption.required_approvals || 0, // Database field needed by type
    windowId: dbRedemption.window_id || dbRedemption.redemption_window_id || "",
    processedAmount: dbRedemption.net_redemption_amount || dbRedemption.token_amount || 0,
    processedDate: dbRedemption.updated_at || "",
    notes: dbRedemption.rejection_reason || "",
    createdAt: dbRedemption.created_at || "",
    
    // Required fields from database schema that weren't in the original mapping
    processed_by: dbRedemption.processed_by || null,
    redemption_window_id: dbRedemption.redemption_window_id || null,
    
    // Additional database fields - all from the RedemptionRequestsTable
    approved_by: dbRedemption.approved_by || null,
    requested_by: dbRedemption.requested_by || null,
    compliance_status: dbRedemption.compliance_status || "pending",
    estimated_processing_time: dbRedemption.estimated_processing_time || null,
    actual_processing_time: dbRedemption.actual_processing_time || null,
    priority_level: dbRedemption.priority_level || null,
    business_rules_version: dbRedemption.business_rules_version || null,
    redemption_fee: dbRedemption.redemption_fee || null,
    net_redemption_amount: dbRedemption.net_redemption_amount || null,
    pro_rata_adjustment: dbRedemption.pro_rata_adjustment || null,
    eligibility_check_id: dbRedemption.eligibility_check_id || null,
    distribution_ids: dbRedemption.distribution_ids || null,
    validation_results: dbRedemption.validation_results || null,
    token_symbol: dbRedemption.token_symbol || null,
    distribution_id: dbRedemption.distribution_id || null,
    distribution_date: dbRedemption.distribution_date || null,
    distribution_tx_hash: dbRedemption.distribution_tx_hash || null,
    usdc_amount: dbRedemption.usdc_amount || null,
    updated_at: dbRedemption.updated_at || "",
    rejected_by: dbRedemption.rejected_by || null,
    rejection_reason: dbRedemption.rejection_reason || null,
    rejection_timestamp: dbRedemption.rejection_timestamp || null,
    window_id: dbRedemption.window_id || "",
    
    // ✅ FIX: Missing fields causing TypeScript error
    execution_mode: dbRedemption.execution_mode || null,
    auto_execute_transfer: dbRedemption.auto_execute_transfer || null,
    transfer_execution_method: dbRedemption.transfer_execution_method || null,
    transfer_execution_triggered_at: dbRedemption.transfer_execution_triggered_at || null,
    transfer_execution_triggered_by: dbRedemption.transfer_execution_triggered_by || null
  };
};

export const mapDbApproverToApprover = (dbApprover: any): Approver => {
  return {
    id: dbApprover.id || "",
    name: dbApprover.name || "",
    role: dbApprover.role || "",
    avatarUrl: dbApprover.avatar_url || "",
    approved: dbApprover.approved || false,
    timestamp: dbApprover.timestamp || "",
  };
};
