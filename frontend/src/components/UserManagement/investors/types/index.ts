/**
 * Type definitions for investor invitation functionality
 */

/**
 * Represents a single investor invite request
 */
export interface InvestorInviteRequest {
  investorId: string;
  userId?: string;
  email: string;
  name: string;
}

/**
 * Information about an investor to be used in bulk invites
 */
export interface InvestorInfo {
  userId?: string;
  email: string;
  name: string;
}

/**
 * Request for sending bulk invitations to multiple investors
 */
export interface BulkInviteRequest {
  investorIds: string[];
  investorInfo: Record<string, InvestorInfo>; // Map of investorId to their information
  delaySeconds?: number; // Optional delay between invites (for rate limiting)
}

/**
 * Error information for a failed invite
 */
export interface InviteError {
  investorId: string;
  investorName: string;
  error: string;
}

/**
 * Progress tracking for bulk invite operations
 */
export interface BulkInviteProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string; // Name of the investor currently being processed
  errors: InviteError[];
}
