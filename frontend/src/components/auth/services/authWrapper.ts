/**
 * Authentication Service
 * 
 * Centralized service for handling all Supabase authentication operations
 * Provides methods for signup, signin, logout, password management, and session handling
 */

import { supabase } from '@/infrastructure/database/client';
import { assignRoleToUser, getRoleByName } from '@/utils/auth/roleUtils';
import type { ProfileType } from '@/types/core/database';
import type {
  SignUpCredentials,
  SignInCredentials,
  SignInWithOtpCredentials,
  VerifyOtpCredentials,
  ResetPasswordCredentials,
  UpdatePasswordCredentials,
  SignOutOptions,
  SignUpResponse,
  SignInResponse,
  VerifyOtpResponse,
  AuthResponse,
  AuthUser,
  AuthSession,
  SignInWithOAuthCredentials,
  LinkIdentityCredentials,
  UnlinkIdentityCredentials,
  ReauthenticateCredentials,
  SignInWithSSOCredentials,
  // TOTP Types
  EnrollTOTPCredentials,
  VerifyTOTPCredentials,
  ChallengeTOTPCredentials,
  TOTPEnrollResponse,
  EnrollTOTPResponse,
  ChallengeTOTPResponse,
  VerifyTOTPResponse,
  ListFactorsResponse,
  TOTPFactor,
  TOTPChallenge,
} from '../types/authTypes';

/**
 * Authentication Service Class
 * Handles all authentication operations with Supabase
 */
export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Map ProfileType to role name (1:1 mapping)
   */
  private getDefaultRoleForProfileType(profileType: string): string {
    const profileTypeRoleMap: Record<string, string> = {
      'issuer': 'Issuer',
      'investor': 'Investor', 
      'service provider': 'Service Provider',
      'super admin': 'Super Admin'
    };
    
    return profileTypeRoleMap[profileType] || 'Viewer';
  }

  /**
   * Assign default role to user based on profile type
   */
  private async assignDefaultRoleToUser(userId: string, profileType?: string): Promise<void> {
    if (!profileType) return;
    
    try {
      const roleName = this.getDefaultRoleForProfileType(profileType);
      const role = await getRoleByName(roleName);
      
      if (role) {
        await assignRoleToUser(userId, role.id);
        console.log(`Assigned role "${roleName}" to user ${userId} based on profile type "${profileType}"`);
      } else {
        console.warn(`Role "${roleName}" not found for profile type "${profileType}"`);
      }
    } catch (error) {
      console.error('Error assigning default role to user:', error);
    }
  }

  /**
   * Sign up a new user with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<SignUpResponse> {
    try {
      // Include profile type in user metadata
      const userMetadata = {
        ...(credentials.options?.data || {}),
        profileType: credentials.profileType
      };

      const { data, error } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          ...credentials.options,
          data: userMetadata,
        },
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      // If user is created successfully and we have a profile type, assign default role
      if (data.user && credentials.profileType) {
        await this.assignDefaultRoleToUser(data.user.id, credentials.profileType);
      }

      return {
        data: {
          user: data.user as AuthUser,
          session: data.session as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign in a user with email and password
   */
  async signIn(email: string, password: string, profileType?: string): Promise<SignInResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      // If profile type is provided, validate it matches user's profile type
      if (profileType && data.user?.user_metadata?.profileType) {
        if (data.user.user_metadata.profileType !== profileType) {
          console.warn(`Profile type mismatch. Expected: ${profileType}, Got: ${data.user.user_metadata.profileType}`);
          // Note: We don't fail login for profile type mismatch, just log it
        }
      }

      return {
        data: {
          user: data.user as AuthUser,
          session: data.session as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign in with OTP (Magic Link or SMS)
   */
  async signInWithOtp(credentials: SignInWithOtpCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: credentials.email,
        phone: credentials.phone,
        options: credentials.options,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign in anonymously as a guest user
   */
  async signInAnonymously(): Promise<SignInResponse> {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: {
          user: data.user as AuthUser,
          session: data.session as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: credentials.provider,
        options: credentials.options,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Get user identities
   */
  async getUserIdentities(): Promise<AuthResponse<any[]>> {
    try {
      const { data, error } = await supabase.auth.getUserIdentities();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.identities || [],
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Link a new identity to the current user
   */
  async linkIdentity(credentials: LinkIdentityCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: credentials.provider,
        options: credentials.options,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Unlink an identity from the current user
   */
  async unlinkIdentity(credentials: UnlinkIdentityCredentials): Promise<AuthResponse> {
    try {
      // First get all user identities to find the one to unlink
      const identitiesResponse = await this.getUserIdentities();
      
      if (!identitiesResponse.success || !identitiesResponse.data) {
        return {
          data: null,
          error: identitiesResponse.error || new Error('Failed to get user identities'),
          success: false,
        };
      }

      // Find the identity to unlink
      const identityToUnlink = identitiesResponse.data.find(
        (identity: any) => identity.id === credentials.identityId
      );

      if (!identityToUnlink) {
        return {
          data: null,
          error: new Error('Identity not found'),
          success: false,
        };
      }

      // Unlink the identity by passing the identity object directly
      const { data, error } = await supabase.auth.unlinkIdentity(identityToUnlink);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Reauthenticate the current user
   * Note: This functionality is handled through password verification or MFA
   */
  async reauthenticate(credentials: ReauthenticateCredentials): Promise<AuthResponse> {
    try {
      // For reauthentication, we typically verify the user's password
      // by attempting to sign in with their current credentials
      const currentUser = await this.getUser();
      if (!currentUser.data?.email) {
        throw new Error('User email not available for reauthentication');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.data.email,
        password: credentials.password,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign in with SSO
   */
  async signInWithSSO(credentials: SignInWithSSOCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithSSO({
        domain: credentials.domain,
        options: credentials.options,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(credentials: VerifyOtpCredentials): Promise<VerifyOtpResponse> {
    try {
      let verifyParams: any;
      
      // Handle different OTP types correctly based on Supabase API requirements
      if (credentials.type === 'sms' && credentials.phone) {
        verifyParams = {
          phone: credentials.phone,
          token: credentials.token,
          type: credentials.type,
        };
      } else if (credentials.email) {
        verifyParams = {
          email: credentials.email,
          token: credentials.token,
          type: credentials.type,
        };
      } else {
        throw new Error('Either email or phone must be provided for OTP verification');
      }

      const { data, error } = await supabase.auth.verifyOtp(verifyParams);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: {
          user: data.user as AuthUser,
          session: data.session as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: null,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(credentials: ResetPasswordCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(
        credentials.email,
        credentials.options
      );

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Update user password
   */
  async updatePassword(credentials: UpdatePasswordCredentials): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: credentials.password,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Get current session
   */
  async getSession(): Promise<AuthResponse<AuthSession>> {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.session as AuthSession,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Get current user
   */
  async getUser(): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.getUser();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<AuthResponse<AuthSession>> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.session as AuthSession,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Update user metadata
   */
  async updateUser(userId: string, attributes: {
    email?: string;
    password?: string;
    data?: Record<string, any>;
    status?: string;
  }): Promise<AuthResponse<AuthUser>> {
    try {
      // For updating current user
      const { data, error } = await supabase.auth.updateUser(attributes);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Resend verification email or SMS
   */
  async resend(options: {
    type: 'signup' | 'email_change' | 'sms';
    email?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    try {
      let resendParams: any;
      
      // Handle different resend types correctly based on Supabase API requirements
      if (options.type === 'sms' && options.phone) {
        resendParams = {
          type: options.type,
          phone: options.phone,
        };
      } else if (options.email) {
        resendParams = {
          type: options.type,
          email: options.email,
        };
      } else {
        throw new Error('Either email or phone must be provided for resend');
      }

      const { data, error } = await supabase.auth.resend(resendParams);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Set up auth state change listener
   */
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session as AuthSession | null);
    });
  }

  // TOTP/MFA Methods

  /**
   * Enroll a new TOTP factor
   */
  async enrollTOTP(credentials: EnrollTOTPCredentials): Promise<EnrollTOTPResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: credentials.factorType,
        friendlyName: credentials.friendlyName,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data as TOTPEnrollResponse,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Verify TOTP enrollment
   */
  async verifyTOTPEnrollment(credentials: VerifyTOTPCredentials): Promise<VerifyTOTPResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: credentials.factorId,
        challengeId: credentials.challengeId,
        code: credentials.code,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      // After MFA verification, get the current session
      const sessionResponse = await this.getSession();
      
      return {
        data: {
          user: data.user as AuthUser,
          session: sessionResponse.data as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Challenge a TOTP factor (for sign-in)
   */
  async challengeTOTP(credentials: ChallengeTOTPCredentials): Promise<ChallengeTOTPResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId: credentials.factorId,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data as TOTPChallenge,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Verify TOTP challenge (complete sign-in)
   */
  async verifyTOTPChallenge(credentials: VerifyTOTPCredentials): Promise<VerifyTOTPResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: credentials.factorId,
        challengeId: credentials.challengeId,
        code: credentials.code,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      // After MFA verification, get the current session
      const sessionResponse = await this.getSession();

      return {
        data: {
          user: data.user as AuthUser,
          session: sessionResponse.data as AuthSession,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * List all MFA factors for the current user
   */
  async listFactors(): Promise<ListFactorsResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      // Properly filter and type the factors
      const totpFactors = (data.all || [])
        .filter((factor: any) => factor.type === 'totp')
        .map((factor: any) => ({
          id: factor.id,
          type: 'totp' as const,
          friendly_name: factor.friendly_name,
          status: factor.status,
          created_at: factor.created_at,
          updated_at: factor.updated_at,
        } as TOTPFactor));

      return {
        data: {
          all: totpFactors,
          totp: totpFactors,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Unenroll (remove) a TOTP factor
   */
  async unenrollTOTP(factorId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Get the authenticator assurance level
   */
  async getAuthenticatorAssuranceLevel(): Promise<AuthResponse<string>> {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.currentLevel,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Check if user has a specific permission
   */
  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      // Check if user has Super Admin role first
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          roles!inner(name)
        `)
        .eq("user_id", userId);

      if (rolesError) {
        console.error(`Error checking roles for user ${userId}:`, rolesError);
      } else if (roles && Array.isArray(roles)) {
        // Check if user has Super Admin role
        const isSuperAdmin = roles.some(r => r.roles && r.roles.name === 'Super Admin');
        if (isSuperAdmin) {
          return true; // Super Admin has all permissions
        }
      }

      // If not Super Admin, check specific permission
      const { data: permissions, error: permissionsError } = await supabase
        .from("role_permissions")
        .select(`
          permission_name
        `)
        .eq("permission_name", permissionName)
        .in("role_id", 
          supabase
            .from("user_roles")
            .select("role_id")
            .eq("user_id", userId)
        );

      if (permissionsError) {
        console.error(`Error checking permission ${permissionName} for user ${userId}:`, permissionsError);
        return false;
      }

      return permissions && permissions.length > 0;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Admin Methods

  /**
   * List users (Admin only)
   */
  async listUsers(options?: {
    page?: number;
    perPage?: number;
    filter?: string;
    sortBy?: string;
    searchTerm?: string;
  }): Promise<AuthResponse<{ users: any[]; total: number }>> {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: options?.page,
        perPage: options?.perPage,
      });

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: {
          users: data.users || [],
          total: (data as any).total || data.users?.length || 0,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Get user by ID (Admin only)
   */
  async getUserById(userId: string): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Update user by ID (Admin only)
   */
  async updateUserById(userId: string, attributes: {
    email?: string;
    password?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    banned_until?: string | null;
  }): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.admin.updateUserById(userId, attributes);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.admin.deleteUser(userId);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Invite user by email (Admin only)
   */
  async inviteUserByEmail(email: string, options?: {
    redirectTo?: string;
    data?: Record<string, any>;
  }): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, options);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Create user (Admin only)
   */
  async createUser(userAttributes: {
    email: string;
    password?: string;
    user_metadata?: Record<string, any>;
    app_metadata?: Record<string, any>;
    email_confirm?: boolean;
  }): Promise<AuthResponse<AuthUser>> {
    try {
      const { data, error } = await supabase.auth.admin.createUser(userAttributes);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: data.user as AuthUser,
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Create user with role assignment and optional invitation (Frontend wrapper)
   * This method matches the expected interface from AddUserModal
   */
  async createUserWithInvitation(params: {
    email: string;
    name: string;
    roleId: string;
    profileType?: string;
    password: string;
    sendInvite: boolean;
  }): Promise<AuthResponse<{ id: string; email: string }>> {
    try {
      if (params.sendInvite) {
        // Use invitation flow - generates link and sends invitation email
        const inviteResult = await this.generateLink({
          type: 'invite',
          email: params.email,
          data: {
            name: params.name,
            profileType: params.profileType,
            roleId: params.roleId,
          },
          redirectTo: `${window.location.origin}/auth/callback`,
        });

        if (!inviteResult.success) {
          return {
            data: null,
            error: inviteResult.error,
            success: false,
          };
        }

        // Also create the user in our database with confirmed email
        const userResult = await this.createUser({
          email: params.email,
          password: params.password,
          user_metadata: {
            name: params.name,
            profileType: params.profileType,
            roleId: params.roleId,
          },
          email_confirm: true, // Auto-confirm since we're sending an invite
        });

        if (!userResult.success) {
          return {
            data: null,
            error: userResult.error,
            success: false,
          };
        }

        return {
          data: {
            id: userResult.data!.id,
            email: userResult.data!.email!,
          },
          error: null,
          success: true,
        };
      } else {
        // Direct user creation without invitation
        const userResult = await this.createUser({
          email: params.email,
          password: params.password,
          user_metadata: {
            name: params.name,
            profileType: params.profileType,
            roleId: params.roleId,
          },
          email_confirm: false, // Require email confirmation
        });

        if (!userResult.success) {
          return {
            data: null,
            error: userResult.error,
            success: false,
          };
        }

        return {
          data: {
            id: userResult.data!.id,
            email: userResult.data!.email!,
          },
          error: null,
          success: true,
        };
      }
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }

  /**
   * Generate link for user (Admin only)
   */
  async generateLink(options: {
    type: 'signup' | 'invite' | 'magiclink' | 'recovery' | 'email_change_current' | 'email_change_new';
    email: string;
    password?: string;
    data?: Record<string, any>;
    redirectTo?: string;
  }): Promise<AuthResponse<{ properties: any; user: AuthUser }>> {
    try {
      // Create separate parameters based on type to match Supabase API
      let linkParams: any;
      
      if (options.type === 'signup') {
        linkParams = {
          type: 'signup' as const,
          email: options.email,
          password: options.password,
          data: options.data,
          redirectTo: options.redirectTo,
        };
      } else if (options.type === 'invite') {
        linkParams = {
          type: 'invite' as const,
          email: options.email,
          data: options.data,
          redirectTo: options.redirectTo,
        };
      } else {
        linkParams = {
          type: options.type,
          email: options.email,
          redirectTo: options.redirectTo,
        };
      }

      const { data, error } = await supabase.auth.admin.generateLink(linkParams);

      if (error) {
        return {
          data: null,
          error,
          success: false,
        };
      }

      return {
        data: {
          properties: data.properties,
          user: data.user as AuthUser,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error as Error,
        success: false,
      };
    }
  }
}

// User Status enum
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

// Export singleton instance
export const authService = AuthService.getInstance();
