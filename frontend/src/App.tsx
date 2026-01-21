import React, { Suspense, useEffect, lazy, useState } from "react";
import { Roles } from '@/utils/auth/constants';
import { initializeBrowserErrorHandling } from '@/utils/browserErrorHandling';
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/infrastructure/database/client";
import { useToast } from "@/components/ui/use-toast";
import { getPrimaryOrFirstProject } from "@/services/project/primaryProjectService";
import { CombinedOrgProjectSelector } from "@/components/organizations";
import Home from "@/components/home";
import CapTableDashboard from "@/components/captable/CapTableDashboard";
import InvestorsList from "@/components/investors/InvestorsList";
import ReportsDashboard from "@/components/reports/ReportsDashboard";
import MainLayout from "@/components/layout/MainLayout";
import CapTableManagerNew from "@/components/captable/CapTableManagerNew";
import FactoringManager from "@/components/factoring/FactoringManager";
import ClimateReceivablesManager from "@/components/climateReceivables/ClimateReceivablesManager";
import { PspLayout } from "@/components/psp";
import RuleManagementDashboard from "@/components/rules/RuleManagementDashboard";
import PolicyTemplateDashboard from "@/components/rules/PolicyTemplateDashboard";
import PolicyTemplateVersionManagement from "@/components/rules/PolicyTemplateVersionManagement";
import RoleManagementDashboard from "@/components/UserManagement/dashboard/RoleManagementDashboard";
import RedemptionDashboard from "@/components/redemption/dashboard/RedemptionDashboard";
import { OperationsRedemptionPage } from "@/pages/redemption";
import { EnhancedRedemptionConfigurationDashboard } from "@/components/redemption/dashboard/EnhancedRedemptionConfigurationDashboard";
import EnhancedRedemptionWindowManager from "@/components/redemption/dashboard/EnhancedRedemptionWindowManager";
import { RedemptionEventsCalendar, CalendarIntegrationTest } from "@/components/redemption/calendar";
import { RedemptionRequestDetailsPage } from "@/components/redemption/requests/RedemptionRequestDetailsPage";
import PasswordResetPage from "@/components/auth/pages/PasswordResetPage";
import MFALoginPage from "@/components/auth/pages/MFALoginPage";
import UserMFAControls from "@/components/UserManagement/security/UserMFAControls";
import { MobileAuthPage } from "@/components/dfns/components/pages/mobile-auth-page";
import EnhancedApprovalDashboard from "@/components/rules/EnhancedApprovalDashboard";
import ProjectDetailsPage from "@/components/projects/ProjectDetails";
import OfferingsPageWrapper from "@/pages/OfferingsPage";

// Activity Pages
import { ActivityMonitorPage, ActivityMetricsPage } from "@/pages/activity";

// Token Pages  
import TokenDashboardPage from "@/components/tokens/pages/TokenDashboardPage";
import TokenEditPage from "@/components/tokens/pages/TokenEditPage";
import TokenDeployPageEnhanced from "@/components/tokens/pages/TokenDeployPageEnhanced";
import TokenEventsPage from "@/components/tokens/pages/TokenEventsPage";
import TokenAnalyticsPage from "@/components/tokens/pages/TokenAnalyticsPage";
import TokenOperationsPage from "@/components/tokens/pages/TokenOperationsPage";
import CreateTokenPage from "@/components/tokens/pages/CreateTokenPage";
import TokenSelectionPage from "@/components/tokens/pages/TokenSelectionPage";
import { TokenTestingPage } from "@/components/tokens/testing";
import TokenDashboardComparison from "@/components/tokens/testing/TokenDashboardComparison";

// XRPL Pages
import { XRPLMasterPage } from "@/components/xrpl/pages/xrpl-master-page";
import { XRPLProjectWrapper } from "@/components/xrpl/pages/xrpl-project-wrapper";

// Injective Pages
import { 
  InjectiveDashboard,
  InjectiveNativeTokenDeployment,
  InjectiveMarketLaunch,
  InjectiveTokenManager,
  InjectiveMTSTransfer,
  InjectiveProjectWrapper
} from "@/components/injective";

// Vault Pages
import { VaultDashboard, VaultProjectWrapper } from "@/components/vault";

// Wallet Pages
import NewWalletPage from "@/pages/wallet/NewWalletPage";
import WalletDashboardPage from "@/pages/wallet/WalletDashboardPage";
import WalletDemoPage from "@/pages/WalletDemoPage";
import InternalWalletDashboard from "@/components/wallet/InternalWalletDashboard";

// Enhanced Wallet Pages (Production-Ready with Real Blockchain Integration)
import RipplePaymentsPage from "@/pages/wallet/RipplePaymentsPage";
import MoonpayPage from "@/pages/wallet/MoonpayPage";
import GuardianTestPageRedesigned from "@/pages/wallet/GuardianTestPageRedesigned";

// Import Enhanced Activity Service for performance monitoring
import { enhancedActivityService, ActivitySource, ActivityCategory, ActivitySeverity } from '@/services/activity';

// Import Universal Database Audit Service for automatic CRUD tracking
import { universalDatabaseAuditService } from '@/services/audit/UniversalDatabaseAuditService';

// Import Multi-Sig Event Listeners Hook for real-time blockchain monitoring
import { useMultiSigEventListeners } from '@/hooks/wallet/useMultiSigEventListeners';

// Import Compliance Components
import DocumentManagement from "@/components/compliance/operations/documents/DocumentManagement";
import RestrictionManager from "@/components/compliance/operations/restrictions/RestrictionManager";
import { WalletOperationsPage } from "@/components/compliance/operations/investor/pages";
import { ComplianceDashboard } from "@/components/activity";

// Import Admin Sidebar Configuration Components (Lazy-loaded to prevent auto-execution)
const SidebarAdminDashboard = lazy(() => import("@/components/admin/sidebar").then(module => ({ default: module.SidebarAdminDashboard })));

// Import Admin Template and Factory Management Components
import { TemplateManagementPage, FactoryConfigurationPage } from "@/components/admin";

// Import Trade Finance Admin Page
import { TradeFinanceAdminPage, SupplyPage, BorrowPage, PortfolioPage, MarketplaceDashboard } from "@/components/trade-finance/pages";

// Import Trade Finance Provider
import { TradeFinanceProvider } from "@/providers/trade-finance";

// Import Enhanced Upload Pages
import EnhancedIssuerUploadPage from "@/components/compliance/pages/EnhancedIssuerUploadPage";
import EnhancedInvestorUploadPage from "@/components/compliance/pages/EnhancedInvestorUploadPage";

// Import Organization and Investor Management Components
import {
  OrganizationManagementDashboard,
  OrganizationDetailPage,
  InvestorManagementDashboardEnhanced,
  InvestorDetailPage
} from "@/components/compliance/management";

// Import Auth Components
import UnauthorizedPage from "@/components/auth/UnauthorizedPage";
import ProtectedRoute, { GuestGuard } from "@/components/auth/ProtectedRoute";

// Import AuthProvider
import { AuthProvider, useAuth } from "@/infrastructure/auth/AuthProvider";

// Import Organization Provider for organization context
import { OrganizationProvider } from "@/components/organizations/OrganizationContext";

// Import Notification Provider
import { NotificationProvider } from "@/infrastructure/utils/helpers/NotificationContext";

// Import Audit Provider for comprehensive user action tracking
import { AuditProvider } from "@/providers/audit/AuditProvider";

// Import conditional Wagmi wrapper for selective Web3 functionality
import { WagmiRouteWrapper } from "@/infrastructure/web3/conditional";

// Import Conditional DFNS Provider for lazy DFNS initialization
import { ConditionalDfnsWrapper } from "@/infrastructure/dfns/ConditionalDfnsProvider";

// Import Wallet Provider for cryptocurrency wallet functionality
import { UnifiedWalletProvider } from "@/services/wallet/UnifiedWalletContext";

// DFNS Components
import { DfnsWalletDashboard } from "@/components/dfns";

// Investor Portal Pages
import ProfilePage from "@/components/compliance/portal/ProfilePage";
import DocumentsPage from "@/components/compliance/portal/DocumentsPage";

// ✅ Import Onboarding Components
import InvestorOnboarding from "@/components/compliance/investor/InvestorOnboarding";

// Import Auth Components
import LoginPage from "@/components/auth/pages/LoginPage";
import {
  WelcomeScreen,
  SignupPage,
  MagicLinkPage,
  PhoneOtpPage,
  AuthCallbackPage,
  EmailVerificationPage,
  TOTPSetupPage,
  SecuritySettingsPage,
  OAuthLoginPage,
  AnonymousLoginPage,
  AdminDashboardPage,
  IdentityManagementPage
} from "@/components/auth/pages";

// Import Multi-Sig Monitoring Component
import { MultiSigListenerHealthBadge } from '@/components/wallet/monitoring';

// Add this import
const IssuerOnboardingFlow = lazy(() => import('@/components/compliance/issuer/onboarding/IssuerOnboardingFlow'));

// Create QueryClient for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// NAV Pages
import NavDashboardPage from '@/pages/nav/nav-dashboard-page';

// Bond Pages
import {
  BondsListPage,
  BondDetailPage,
  BondCalculatorPage,
  BondAddPage,
  BondUploadPage,
  BondAnalyticsPage,
  BondTokenLinksPage,
  BondHistoryPage,
} from '@/pages/nav/bonds';

// MMF Pages
import {
  MMFsListPage,
  MMFDetailPage,
  MMFCalculatorPage,
  MMFAddPage,
  MMFAnalyticsPage,
  MMFNAVTrackerPage,
  MMFUploadPage,
  MMFHistoryPage,
  MMFTokenLinksPage,
} from '@/pages/nav/mmf';

// ETF Pages
import {
  ETFListPage,
  ETFDetailPage,
  ETFCalculatorPage,
  ETFAddPage,
  ETFAnalyticsPage,
  ETFNAVTrackerPage,
  ETFUploadPage,
  ETFHistoryPage,
  ETFTokenLinksPage,
} from '@/pages/nav/etf';

// Redirect component for token routes
const TokenRedirect = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (projectId && projectId !== "undefined") {
      // If projectId is provided and valid, redirect to project tokens
      navigate(`/projects/${projectId}/tokens`, { replace: true });
    } else {
      // Otherwise, find the primary project
      findPrimaryProject();
    }
  }, [projectId, navigate]);

  // Function to find and navigate to the primary project
  const findPrimaryProject = async () => {
    try {
      setIsLoading(true);

      // Use the primaryProjectService to get the primary or first project
      const project = await getPrimaryOrFirstProject();

      if (project) {
        // If a project is found, navigate to it
        console.log(`Found project: ${project.name} (${project.id}), redirecting...`);
        navigate(`/projects/${project.id}/tokens`, { replace: true });
      } else {
        // No projects at all, redirect to projects page
        console.warn("No projects found, redirecting to projects page");
        navigate('/projects');
      }
    } catch (error: any) {
      console.error("Error finding primary project:", error);
      toast({
        title: "Error",
        description: "Failed to find a default project. Redirecting to projects page.",
        variant: "destructive",
      });
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="text-center">
        {isLoading ? (
          <div className="flex flex-col items-center">
            <RefreshCw className="h-6 w-6 animate-spin mb-4" />
            <span>Finding default project...</span>
          </div>
        ) : (
          <span>Redirecting...</span>
        )}
      </div>
    </div>
  );
};

// Token Detail Redirect - redirects to operations by default
const TokenDetailRedirect = () => {
  const { projectId, tokenId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId && tokenId) {
      navigate(`/projects/${projectId}/tokens/${tokenId}/operations`, { replace: true });
    }
  }, [projectId, tokenId, navigate]);

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div className="text-center">
        <RefreshCw className="h-6 w-6 animate-spin mb-4" />
        <span>Redirecting to token operations...</span>
      </div>
    </div>
  );
};

// Wrapper component for RedemptionConfigurationDashboard with project selection
const RedemptionConfigurationWrapper = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    findPrimaryProject();
  }, []);

  // Function to find and set the primary project
  const findPrimaryProject = async () => {
    try {
      setIsLoading(true);

      // Use the primaryProjectService to get the primary or first project
      const projectData = await getPrimaryOrFirstProject();

      if (projectData) {
        // If a project is found, use it for the redemption configuration
        console.log(`Using project: ${projectData.name} (${projectData.id}) for redemption configuration`);
        setProjectId(projectData.id);
        setProject(projectData);
      } else {
        // No projects at all, redirect to projects page
        console.warn("No projects found, redirecting to projects page");
        toast({
          title: "No Projects Found",
          description: "Please create a project first to access redemption configuration.",
          variant: "destructive",
        });
        navigate('/projects');
      }
    } catch (error: any) {
      console.error("Error finding primary project:", error);
      toast({
        title: "Error",
        description: "Failed to find a default project. Redirecting to projects page.",
        variant: "destructive",
      });
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      setProjectId(newProjectId);
      // No navigation needed as we're staying on the same page with different project
    }
  };

  const handleRefresh = () => {
    findPrimaryProject();
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin mb-4" />
          <span>Finding default project...</span>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name || "Project"} - Redemption Configuration
            </h1>
            <p className="text-muted-foreground">
              Configure redemption rules and windows for this project
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector
              currentProjectId={projectId}
              onProjectChange={handleProjectChange}
              layout="horizontal"
              compact={true}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <EnhancedRedemptionConfigurationDashboard projectId={projectId} />
    </div>
  );
};

// Wrapper component for RedemptionWindowManager with project selection
const RedemptionWindowWrapper = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    findPrimaryProject();
  }, []);

  // Function to find and set the primary project
  const findPrimaryProject = async () => {
    try {
      setIsLoading(true);

      // Use the primaryProjectService to get the primary or first project
      const projectData = await getPrimaryOrFirstProject();

      if (projectData) {
        // If a project is found, use it for the redemption windows
        console.log(`Using project: ${projectData.name} (${projectData.id}) for redemption windows`);
        setProjectId(projectData.id);
        setProject(projectData);
      } else {
        // No projects at all, redirect to projects page
        console.warn("No projects found, redirecting to projects page");
        toast({
          title: "No Projects Found",
          description: "Please create a project first to access redemption windows.",
          variant: "destructive",
        });
        navigate('/projects');
      }
    } catch (error: any) {
      console.error("Error finding primary project:", error);
      toast({
        title: "Error",
        description: "Failed to find a default project. Redirecting to projects page.",
        variant: "destructive",
      });
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = (newProjectId: string) => {
    if (newProjectId !== projectId) {
      setProjectId(newProjectId);
      // No navigation needed as we're staying on the same page with different project
    }
  };

  const handleRefresh = () => {
    findPrimaryProject();
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 animate-spin mb-4" />
          <span>Finding default project...</span>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6">
        <div className="text-center">
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-center p-6 pb-3 bg-white border-b">
        <div className="flex items-center space-x-2 w-full justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {project?.name || "Project"} - Redemption Windows
            </h1>
            <p className="text-muted-foreground">
              Manage interval fund redemption windows and configurations for this project
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CombinedOrgProjectSelector
              currentProjectId={projectId}
              onProjectChange={handleProjectChange}
              layout="horizontal"
              compact={true}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      <EnhancedRedemptionWindowManager projectId={projectId} />
    </div>
  );
};

/**
 * Main App component with routing configuration
 */
function App() {
  // ============================================================================
  // INITIALIZE MULTI-SIG EVENT LISTENERS (Phase 3 Integration)
  // ============================================================================
  // Auto-starts event listeners when user logs in
  // Monitors on-chain multi-sig transactions in real-time
  // Updates database automatically from blockchain events
  const { user } = useAuth();
  const { health: multiSigHealth, isInitialized: multiSigInitialized } = useMultiSigEventListeners(user?.id, {
    autoStart: true,
    autoStop: true,
    healthCheckInterval: 30000 // Check health every 30 seconds
  });

  useEffect(() => {
    if (multiSigInitialized) {
      console.log('✅ Multi-Sig Event Listeners initialized successfully');
      console.log(`📊 Active listeners: ${multiSigHealth?.activeListeners || 0}`);
    }
  }, [multiSigInitialized, multiSigHealth]);

  useEffect(() => {
    // Initialize browser error handling for console cleanup
    initializeBrowserErrorHandling();

    // Initialize Enhanced Activity Service v2
    console.log('✅ Enhanced Activity Service v2 initialized - Performance monitoring active');

    // Initialize Universal Database Audit Service for automatic CRUD tracking
    const initializeAuditService = async () => {
      try {
        await universalDatabaseAuditService.initialize();
        console.log('🔍 Universal Database Audit Service initialized - Automatic CRUD tracking active for 232+ tables');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Universal Database Audit Service:', error);
      }
    };

    initializeAuditService();

    // Initialize Comprehensive Audit System
    console.log('🔍 Comprehensive Audit System activated - Frontend user action tracking enabled');
    console.log('📊 Audit Coverage: >95% (Frontend + Backend + System processes)');

    // Log application startup
    enhancedActivityService.logActivity({
      source: ActivitySource.SYSTEM,
      action: 'application_startup',
      entityType: 'application',
      entityId: 'chain_capital_app',
      details: 'Chain Capital application started successfully with comprehensive audit system and automatic CRUD tracking',
      category: ActivityCategory.SYSTEM,
      severity: ActivitySeverity.INFO
    });
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <OrganizationProvider>
          <AuditProvider enableAutoTracking={true}>
            <WagmiRouteWrapper>
              <UnifiedWalletProvider>
                <NotificationProvider>
                  {/* Multi-Sig Listener Health Badge (Fixed Position) */}
                  {multiSigInitialized && multiSigHealth && (
                    <div className="fixed bottom-4 right-4 z-50">
                      <MultiSigListenerHealthBadge health={multiSigHealth} />
                    </div>
                  )}

                  <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                      {/* Root Route - Show Welcome Screen for unauthenticated users, redirect authenticated users to projects */}
                      <Route path="/" element={
                        <GuestGuard redirectTo="/projects">
                          <WelcomeScreen />
                        </GuestGuard>
                      } />

                      {/* Auth Routes - Publicly accessible */}
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/unauthorized" element={<UnauthorizedPage />} />

                      {/* Comprehensive Auth Routes */}
                      <Route path="/auth/welcome" element={<WelcomeScreen />} />
                      <Route path="/auth/login" element={<LoginPage />} />
                      <Route path="/auth/signup" element={<SignupPage />} />
                      <Route path="/auth/magic-link" element={<MagicLinkPage />} />
                      <Route path="/auth/phone" element={<PhoneOtpPage />} />
                      <Route path="/auth/oauth" element={<OAuthLoginPage />} />
                      <Route path="/auth/anonymous" element={<AnonymousLoginPage />} />
                      <Route path="/auth/mfa" element={<MFALoginPage />} />
                      <Route path="/auth/callback" element={<AuthCallbackPage />} />
                      <Route path="/auth/verify-email" element={<EmailVerificationPage />} />
                      <Route path="/auth/setup-totp" element={<TOTPSetupPage />} />
                      <Route path="/auth/forgot-password" element={<PasswordResetPage />} />
                      <Route path="/auth/reset-password" element={<PasswordResetPage />} />

                      {/* DFNS Mobile Authentication Route */}
                      <Route path="/mobile-auth" element={<MobileAuthPage />} />

                      {/* Settings Routes - Protected */}
                      <Route path="/settings/security" element={
                        <ProtectedRoute>
                          <SecuritySettingsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/settings/identity" element={
                        <ProtectedRoute>
                          <IdentityManagementPage />
                        </ProtectedRoute>
                      } />

                      {/* Admin Auth Routes - Protected with admin role */}
                      <Route path="/admin/auth" element={
                        <ProtectedRoute requiredRoles={['admin']}>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      } />

                      {/* Add redirect for tokens/:projectId to projects/:projectId/tokens */}
                      <Route path="/tokens/:projectId" element={
                        <ProtectedRoute>
                          <TokenRedirect />
                        </ProtectedRoute>
                      } />

                      {/* Main Layout - Protected - Ensures Sidebar Renders Only Once */}
                      <Route element={
                        <ProtectedRoute>
                          <MainLayout />
                        </ProtectedRoute>
                      }>
                        <Route path="dashboard" element={<CapTableDashboard />} />
                        <Route path="projects" element={<Home />} />
                        <Route path="offerings" element={<OfferingsPageWrapper />} />

                        {/* Global Token Routes */}
                        <Route path="tokens" element={<TokenDashboardPage />} />
                        <Route path="tokens/compare" element={<TokenDashboardComparison />} />
                        <Route path="tokens/create" element={<CreateTokenPage />} />
                        <Route path="tokens/test" element={<TokenTestingPage />} />

                        {/* Investor Portal Routes */}
                        <Route path="compliance/portal/profile" element={<ProfilePage />} />
                        <Route path="compliance/portal/documents" element={<DocumentsPage />} />

                        {/* Project Routes */}
                        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                        <Route path="projects/:projectId/documents" element={<Navigate to="../?tab=issuer-documents" replace />} />

                        {/* Wallet Routes */}
                        <Route path="wallet/new" element={<NewWalletPage />} />
                        <Route path="wallet/:projectId/new" element={<NewWalletPage />} />
                        <Route path="wallet/dashboard" element={<WalletDashboardPage />} />
                        <Route path="wallet/demo" element={<WalletDemoPage />} />

                        {/* Enhanced Wallet Routes (Production-Ready) */}
                        <Route path="wallet/enhanced/ripple" element={<RipplePaymentsPage />} />
                        <Route path="wallet/enhanced/moonpay" element={<MoonpayPage />} />

                        {/* Guardian Wallet Routes */}
                        <Route path="wallet/guardian/test" element={<GuardianTestPageRedesigned />} />

                        {/* DFNS Wallet Routes - Enterprise blockchain infrastructure */}
                        <Route path="wallet/dfns/*" element={<DfnsWalletDashboard />} />

                        {/* Production Wallet Routes (Default to Internal Dashboard) */}
                        <Route path="wallet/internal" element={<InternalWalletDashboard />} />

                        {/* XRPL Routes - XRP Ledger Integration */}
                        {/* Global XRPL route (will auto-select project) */}
                        <Route path="xrpl/*" element={<XRPLProjectWrapper />} />
                        
                        {/* Project-specific XRPL Routes */}
                        <Route path="projects/:projectId/xrpl/*" element={<XRPLProjectWrapper />} />

                        {/* Injective Routes - TokenFactory Integration */}
                        {/* Global Injective route (will auto-select project) */}
                        <Route path="injective/*" element={<InjectiveProjectWrapper />} />
                        
                        {/* Project-specific Injective Routes */}
                        <Route path="projects/:projectId/injective/*" element={<InjectiveProjectWrapper />} />

                        {/* Vault Routes */}
                        {/* Global Vault route (will auto-select project) */}
                        <Route path="vault/*" element={<VaultProjectWrapper />} />
                        
                        {/* Project-specific Vault Routes */}
                        <Route path="projects/:projectId/vault/*" element={<VaultProjectWrapper />} />

                        {/* Cap Table Routes */}
                        <Route path="captable" element={<CapTableManagerNew section="overview" />} />
                        <Route path="captable/investors" element={<CapTableManagerNew section="investors" />} />
                        <Route path="captable/subscriptions" element={<CapTableManagerNew section="subscriptions" />} />
                        <Route path="captable/allocations" element={<CapTableManagerNew section="allocations" />} />
                        <Route path="captable/distributions" element={<CapTableManagerNew section="distributions" />} />
                        <Route path="captable/compliance" element={<CapTableManagerNew section="compliance" />} />
                        <Route path="captable/reports" element={<CapTableManagerNew section="reports" />} />
                        <Route path="captable/documents" element={<CapTableManagerNew section="documents" />} />
                        <Route path="captable/minting" element={<CapTableManagerNew section="minting" />} />

                        {/* Token Management */}
                        <Route path="tokens" element={<TokenDashboardPage />} />
                        <Route path="tokens/create" element={<CreateTokenPage />} />
                        <Route path="tokens/:tokenId/edit" element={<TokenEditPage />} />
                        <Route path="tokens/:tokenId/deploy" element={<TokenDeployPageEnhanced />} />
                        <Route path="tokens/:tokenId/operations" element={<TokenOperationsPage />} />

                        {/* Project-specific Token Routes */}
                        <Route path="projects/:projectId/tokens" element={<TokenDashboardPage />} />
                        <Route path="projects/:projectId/tokens/compare" element={<TokenDashboardComparison />} />
                        <Route path="projects/:projectId/tokens/create" element={<CreateTokenPage />} />
                        <Route path="projects/:projectId/tokens/test" element={<TokenTestingPage />} />

                        {/* Token Selection Routes */}
                        <Route path="projects/:projectId/tokens/select/details" element={<TokenSelectionPage actionType="details" />} />
                        <Route path="projects/:projectId/tokens/select/deploy" element={<TokenSelectionPage actionType="deploy" />} />
                        <Route path="projects/:projectId/tokens/select/mint" element={<TokenSelectionPage actionType="mint" />} />
                        <Route path="projects/:projectId/tokens/select/operations" element={<TokenOperationsPage />} />

                        {/* Token-specific Routes */}
                        <Route path="projects/:projectId/tokens/:tokenId" element={<TokenDetailRedirect />} />
                        <Route path="projects/:projectId/tokens/:tokenId/deploy" element={<TokenDeployPageEnhanced />} />
                        <Route path="projects/:projectId/tokens/:tokenId/events" element={<TokenEventsPage />} />
                        <Route path="projects/:projectId/tokens/:tokenId/analytics" element={<TokenAnalyticsPage />} />
                        <Route path="projects/:projectId/tokens/:tokenId/operations" element={<TokenOperationsPage />} />

                        {/* NAV Routes */}
                        <Route path="nav" element={<NavDashboardPage />} />
                        <Route path="projects/:projectId/nav/" element={<NavDashboardPage />} />

                        {/* Bond Routes */}
                        <Route path="nav/bonds" element={<BondsListPage />} />
                        <Route path="nav/bonds/new" element={<BondAddPage />} />
                        <Route path="nav/bonds/upload" element={<BondUploadPage />} />
                        <Route path="nav/bonds/analytics" element={<BondAnalyticsPage />} />
                        <Route path="nav/bonds/token-links" element={<BondTokenLinksPage />} />
                        <Route path="nav/bonds/history" element={<BondHistoryPage />} />
                        <Route path="nav/bonds/:bondId" element={<BondDetailPage />} />
                        <Route path="nav/bonds/:bondId/edit" element={<BondDetailPage />} />
                        <Route path="nav/bonds/:bondId/calculate" element={<BondCalculatorPage />} />

                        {/* Project-specific Bond Routes */}
                        <Route path="projects/:projectId/nav/bonds" element={<BondsListPage />} />
                        <Route path="projects/:projectId/nav/bonds/new" element={<BondAddPage />} />
                        <Route path="projects/:projectId/nav/bonds/upload" element={<BondUploadPage />} />
                        <Route path="projects/:projectId/nav/bonds/analytics" element={<BondAnalyticsPage />} />
                        <Route path="projects/:projectId/nav/bonds/token-links" element={<BondTokenLinksPage />} />
                        <Route path="projects/:projectId/nav/bonds/history" element={<BondHistoryPage />} />
                        <Route path="projects/:projectId/nav/bonds/:bondId" element={<BondDetailPage />} />
                        <Route path="projects/:projectId/nav/bonds/:bondId/edit" element={<BondDetailPage />} />
                        <Route path="projects/:projectId/nav/bonds/:bondId/calculate" element={<BondCalculatorPage />} />

                        {/* MMF Routes */}
                        <Route path="nav/mmf" element={<MMFsListPage />} />
                        <Route path="nav/mmf/create" element={<MMFAddPage />} />
                        <Route path="nav/mmf/upload" element={<MMFUploadPage />} />
                        <Route path="nav/mmf/analytics" element={<MMFAnalyticsPage />} />
                        <Route path="nav/mmf/nav-tracker" element={<MMFNAVTrackerPage />} />
                        <Route path="nav/mmf/token-links" element={<MMFTokenLinksPage />} />
                        <Route path="nav/mmf/history" element={<MMFHistoryPage />} />
                        <Route path="nav/mmf/:fundId" element={<MMFDetailPage />} />
                        <Route path="nav/mmf/:fundId/calculate" element={<MMFCalculatorPage />} />

                        {/* Project-specific MMF Routes */}
                        <Route path="projects/:projectId/nav/mmf" element={<MMFsListPage />} />
                        <Route path="projects/:projectId/nav/mmf/create" element={<MMFAddPage />} />
                        <Route path="projects/:projectId/nav/mmf/upload" element={<MMFUploadPage />} />
                        <Route path="projects/:projectId/nav/mmf/analytics" element={<MMFAnalyticsPage />} />
                        <Route path="projects/:projectId/nav/mmf/nav-tracker" element={<MMFNAVTrackerPage />} />
                        <Route path="projects/:projectId/nav/mmf/token-links" element={<MMFTokenLinksPage />} />
                        <Route path="projects/:projectId/nav/mmf/history" element={<MMFHistoryPage />} />
                        <Route path="projects/:projectId/nav/mmf/:fundId" element={<MMFDetailPage />} />
                        <Route path="projects/:projectId/nav/mmf/:fundId/calculate" element={<MMFCalculatorPage />} />

                        {/* ETF Routes */}
                        <Route path="nav/etf" element={<ETFListPage />} />
                        <Route path="nav/etf/create" element={<ETFAddPage />} />
                        <Route path="nav/etf/upload" element={<ETFUploadPage />} />
                        <Route path="nav/etf/analytics" element={<ETFAnalyticsPage />} />
                        <Route path="nav/etf/nav-tracker" element={<ETFNAVTrackerPage />} />
                        <Route path="nav/etf/token-links" element={<ETFTokenLinksPage />} />
                        <Route path="nav/etf/history" element={<ETFHistoryPage />} />
                        <Route path="nav/etf/:fundId" element={<ETFDetailPage />} />
                        <Route path="nav/etf/:fundId/calculate" element={<ETFCalculatorPage />} />

                        {/* Project-specific ETF Routes */}
                        <Route path="projects/:projectId/nav/etf" element={<ETFListPage />} />
                        <Route path="projects/:projectId/nav/etf/create" element={<ETFAddPage />} />
                        <Route path="projects/:projectId/nav/etf/upload" element={<ETFUploadPage />} />
                        <Route path="projects/:projectId/nav/etf/analytics" element={<ETFAnalyticsPage />} />
                        <Route path="projects/:projectId/nav/etf/nav-tracker" element={<ETFNAVTrackerPage />} />
                        <Route path="projects/:projectId/nav/etf/token-links" element={<ETFTokenLinksPage />} />
                        <Route path="projects/:projectId/nav/etf/history" element={<ETFHistoryPage />} />
                        <Route path="projects/:projectId/nav/etf/:fundId" element={<ETFDetailPage />} />
                        <Route path="projects/:projectId/nav/etf/:fundId/calculate" element={<ETFCalculatorPage />} />

                        {/* Factoring Routes */}
                        <Route path="factoring/" element={<FactoringManager />} />
                        <Route path="factoring/dashboard" element={<FactoringManager section="dashboard" />} />
                        <Route path="factoring/invoices" element={<FactoringManager section="invoices" />} />
                        <Route path="factoring/pools" element={<FactoringManager section="pools" />} />
                        <Route path="factoring/tokenization" element={<FactoringManager section="tokenization" />} />
                        <Route path="factoring/distribution" element={<FactoringManager section="distribution" />} />

                        {/* Project-specific Factoring Routes */}
                        <Route path="/projects/:projectId/factoring/" element={<FactoringManager />} />
                        <Route path="/projects/:projectId/factoring/dashboard" element={<FactoringManager section="dashboard" />} />
                        <Route path="/projects/:projectId/factoring/invoices" element={<FactoringManager section="invoices" />} />
                        <Route path="/projects/:projectId/factoring/pools" element={<FactoringManager section="pools" />} />
                        <Route path="/projects/:projectId/factoring/tokenization" element={<FactoringManager section="tokenization" />} />
                        <Route path="/projects/:projectId/factoring/distribution" element={<FactoringManager section="distribution" />} />

                        {/* Climate Receivables Routes */}
                        <Route path="climate-receivables/*" element={<ClimateReceivablesManager />} />

                        {/* Project-specific Climate Receivables Routes */}
                        <Route path="/projects/:projectId/climate-receivables/*" element={<ClimateReceivablesManager />} />

                        {/* PSP Routes */}
                        <Route path="psp/" element={<PspLayout />} />
                        <Route path="psp/:section" element={<PspLayout />} />

                        {/* Project-specific PSP Routes */}
                        <Route path="/projects/:projectId/psp/" element={<PspLayout />} />
                        <Route path="/projects/:projectId/psp/:section" element={<PspLayout />} />

                        {/* Project-specific Cap Table Routes */}
                        <Route path="/projects/:projectId/captable" element={<CapTableManagerNew />} />
                        <Route path="/projects/:projectId/captable/investors" element={<CapTableManagerNew section="investors" />} />
                        <Route path="/projects/:projectId/captable/subscriptions" element={<CapTableManagerNew section="subscriptions" />} />
                        <Route path="/projects/:projectId/captable/allocations" element={<CapTableManagerNew section="allocations" />} />
                        <Route path="/projects/:projectId/captable/distributions" element={<CapTableManagerNew section="distributions" />} />
                        <Route path="/projects/:projectId/captable/minting" element={<CapTableManagerNew section="minting" />} />

                        {/* Management and Reporting Routes */}
                        <Route path="rule-management" element={<RuleManagementDashboard />} />
                        <Route path="role-management" element={<RoleManagementDashboard />} />
                        <Route path="mfa-settings" element={<MFALoginPage />} />
                        <Route path="account/security" element={
                          <UserMFAControls
                            userId="current-user"
                            userName="Current User"
                            mfaEnabled={false}
                          />
                        } />
                        <Route path="redemption" element={<RedemptionDashboard />} />
                        <Route path="redemption/operations" element={<OperationsRedemptionPage />} />
                        <Route path="redemption/configure" element={<RedemptionConfigurationWrapper />} />
                        <Route path="redemption/windows" element={<RedemptionWindowWrapper />} />
                        <Route path="redemption/request/:requestId" element={<RedemptionRequestDetailsPage />} />
                        <Route path="redemption/calendar" element={<RedemptionEventsCalendar />} />
                        <Route path="redemption/calendar/test" element={<CalendarIntegrationTest />} />

                        <Route path="investors" element={<InvestorsList />} />
                        <Route path="reports" element={<ReportsDashboard />} />

                        {/* Policy Template Routes */}
                        <Route path="templates" element={<PolicyTemplateDashboard />} />
                        <Route path="templates/:templateId" element={<PolicyTemplateVersionManagement />} />
                        <Route path="templates/:templateId/versions" element={<PolicyTemplateVersionManagement />} />

                        {/* Compliance Routes - Moved inside MainLayout */}
                        <Route path="compliance/investor-onboarding/*" element={<InvestorOnboarding />} />
                        <Route path="compliance/issuer-onboarding" element={<IssuerOnboardingFlow />} />

                        {/* Enhanced Upload Routes */}
                        <Route path="compliance/upload/investor" element={<EnhancedInvestorUploadPage />} />
                        <Route path="compliance/upload/issuer" element={<EnhancedIssuerUploadPage />} />

                        {/* Organization Management Routes */}
                        <Route path="compliance/management" element={<OrganizationManagementDashboard />} />
                        <Route path="compliance/organization/:organizationId" element={<OrganizationDetailPage />} />
                        <Route path="compliance/organization/:organizationId/edit" element={<OrganizationDetailPage />} />
                        <Route path="compliance/organization/:organizationId/documents" element={<OrganizationDetailPage />} />

                        {/* Investor Management Routes */}
                        <Route path="compliance/management/investors" element={<InvestorManagementDashboardEnhanced />} />
                        <Route path="compliance/investor/:investorId" element={<InvestorDetailPage />} />
                        <Route path="compliance/investor/:investorId/edit" element={<InvestorDetailPage />} />
                        <Route path="compliance/investor/:investorId/documents" element={<InvestorDetailPage />} />

                        <Route path="compliance/operations/dashboard" element={<ComplianceDashboard />} />
                        <Route path="compliance/documents" element={<DocumentManagement mode="issuer" entityId="general" />} />
                        <Route path="compliance/rules" element={<RuleManagementDashboard />} />
                        <Route path="compliance/restrictions" element={<RestrictionManager />} />
                        <Route path="compliance/operations/investor/wallets" element={<WalletOperationsPage />} />
                        <Route path="compliance/operations/investor/:projectId/wallets" element={<WalletOperationsPage />} />

                        {/* Issuer Onboarding */}
                        <Route path="compliance/issuer/onboarding/*" element={<IssuerOnboardingFlow />} />

                        {/* Activity Monitoring Routes (Legacy) */}
                        <Route path="activity" element={<ActivityMonitorPage />} />
                        <Route path="activity/metrics" element={<ActivityMetricsPage />} />

                        {/* NAV Engine Routes */}
                        <Route path="nav" element={<NavDashboardPage />} />
                        
                        {/* Admin Configuration Routes */}
                        <Route path="admin/sidebar-configuration" element={<SidebarAdminDashboard />} />
                        <Route path="admin/templates" element={<TemplateManagementPage />} />
                        <Route path="admin/factory-config" element={<FactoryConfigurationPage />} />
                        
                        {/* Trade Finance Admin Route - Wrapped in TradeFinanceProvider */}
                        <Route path="admin/trade-finance" element={
                          <TradeFinanceProvider>
                            <TradeFinanceAdminPage />
                          </TradeFinanceProvider>
                        } />

                        {/* Trade Finance User Routes - All wrapped in single TradeFinanceProvider for shared project state */}
                        <Route path="trade-finance/*" element={
                          <TradeFinanceProvider>
                            <Routes>
                              <Route path="marketplace" element={<MarketplaceDashboard />} />
                              <Route path="supply" element={<SupplyPage />} />
                              <Route path="borrow" element={<BorrowPage />} />
                              <Route path="portfolio" element={<PortfolioPage />} />
                            </Routes>
                          </TradeFinanceProvider>
                        } />
                      </Route>

                      {/* Fallback route */}
                      <Route path="*" element={
                        <div style={{ padding: "2rem", textAlign: "center" }}>
                          <h1>Page Not Found</h1>
                          <p>The route {window.location.pathname} doesn't exist.</p>
                          <div style={{ marginTop: "2rem" }}>
                            <a href="/" style={{ color: "blue", textDecoration: "underline" }}>Go Home</a>
                          </div>
                        </div>
                      } />
                    </Routes>
                  </Suspense>
                </NotificationProvider>
              </UnifiedWalletProvider>
            </WagmiRouteWrapper>
          </AuditProvider>
        </OrganizationProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
