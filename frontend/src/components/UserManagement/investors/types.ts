// Types for Investor User Management

export interface InvestorWithUser {
  // Investor fields
  investor_id: string;
  name: string;
  email: string;
  type?: string;
  company?: string;
  kyc_status?: string;
  kyc_expiry_date?: string;
  wallet_address?: string;
  created_at: string;
  updated_at?: string;
  
  // User account linking fields
  user_id: string | null;
  profile_id: string | null;
  profile_type?: string | null;
  
  // Joined user data (when user account exists)
  user?: {
    id: string;
    email: string;
    name: string;
    status: string;
    created_at: string;
    updated_at: string;
  } | null;
  
  // Joined profile data (when profile exists)
  profile?: {
    id: string;
    user_id: string;
    profile_type: string;
    created_at: string;
    updated_at: string;
  } | null;
}

export interface CreateInvestorUserRequest {
  investorId: string;
  email: string;
  name: string;
  password?: string;
  sendInvite?: boolean;
  roleId?: string;
}

export interface InvestorInviteRequest {
  investorId: string;
  userId: string;
  email: string;
  name: string;
  resend?: boolean;
}

export interface BulkInviteRequest {
  investorIds: string[];
  delaySeconds?: number;
}

export interface BulkInviteProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
  errors: Array<{
    investorId: string;
    investorName: string;
    error: string;
  }>;
}
